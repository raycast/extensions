import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import { ensureEntryToken, makeClient } from "./api/linearClient";
import { fetchViewerIdentity, getServiceForProviderId, stagingService, workspaceProviderId } from "./api/oauth";
import { traceWorkspaceAdd } from "./api/workspaceAddDiagnostics";
import { createWorkspaceAddFlow } from "./api/workspaceAddFlow";
import {
  entryKey,
  EntryRef,
  getActiveEntry,
  migrateIfNeeded,
  readRegistry,
  reconcileEntries,
  removeWorkspaceEntry,
  setActiveEntry,
  upsertWorkspaceEntry,
  WorkspaceEntry,
  WorkspaceRegistry,
} from "./api/workspaces";
import { refreshQuickCommandSubtitles } from "./helpers/refreshQuickSubtitles";
import { clearWorkspaceNotificationsCache } from "./hooks/useAllWorkspaceNotifications";

type Row = { entry: WorkspaceEntry; hasToken: boolean };

// The flow lives outside the component so a remounted view can join an active add.
const ADD_IN_FLIGHT_KEY = "staging-add-in-flight";
const workspaceAdd = createWorkspaceAddFlow({
  staging: stagingService.client,
  hasPendingAdd: async () => Boolean(await LocalStorage.getItem<string>(ADD_IN_FLIGHT_KEY)),
  markPendingAdd: () => LocalStorage.setItem(ADD_IN_FLIGHT_KEY, "1"),
  clearPendingAdd: () => LocalStorage.removeItem(ADD_IN_FLIGHT_KEY),
  authorize: () => stagingService.authorize(),
  identify: fetchViewerIdentity,
  verify: async (accessToken) => makeClient(accessToken).viewer,
  getDestination: async (identity) => {
    const registry = await readRegistry();
    const existing = registry.workspaces.find((entry) => entryKey(entry) === entryKey(identity));
    // An adopted first workspace keeps its original "linear" storage slot.
    const providerId = existing?.providerId ?? workspaceProviderId(identity.orgId, identity.userId);
    return getServiceForProviderId(providerId, undefined, `Linear — ${identity.orgName}`).client;
  },
  register: upsertWorkspaceEntry,
  trace: traceWorkspaceAdd,
});

async function revokeAtLinear(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.linear.app/oauth/revoke", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default function ManageWorkspaces() {
  const [isLoading, setIsLoading] = useState(true);
  const [registry, setRegistry] = useState<WorkspaceRegistry | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const fresh = await migrateIfNeeded({ allowWrite: true });
    setRegistry(fresh);
    setRows(await reconcileEntries(fresh));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const recovered = await workspaceAdd.recover();
        if (recovered) refreshQuickCommandSubtitles();
      } catch {
        // The flow logs the failing stage in development and preserves recovery state.
      }
      await reload();
    })();
  }, [reload]);

  async function addWorkspace() {
    const proceed = await confirmAlert({
      title: "Add a Linear Workspace",
      // S3: there is NO workspace picker on Linear's consent page — the grant binds to
      // whichever workspace is active at linear.app. The user steers it there first.
      message:
        "First, in your browser, go to linear.app and switch to the workspace you want to add (top-left workspace switcher). Then continue — Linear will ask you to approve access for that workspace.",
      primaryAction: { title: "Continue to Linear" },
    });
    if (!proceed) return;
    try {
      const added = await workspaceAdd.add();
      if (added) {
        await showToast({
          style: Toast.Style.Success,
          title: added.isNew ? `Added ${added.identity.orgName}` : `Re-authenticated ${added.identity.orgName}`,
          message: added.identity.userEmail,
        });
        refreshQuickCommandSubtitles();
      }
      await traceWorkspaceAdd("ui.reload", reload);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Adding workspace failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function reauthenticate(entry: WorkspaceEntry) {
    try {
      const service = getServiceForProviderId(entry.providerId, undefined, `Linear — ${entry.orgName}`);
      await service.client.removeTokens();
      // ensureEntryToken (NOT plain authorize): the grant follows the account/workspace
      // active at linear.app (S3), so the minted token's (orgId, userId) is verified
      // against THIS entry and rejected with a corrective message on mismatch (D10).
      await ensureEntryToken(entry, { interactive: true });
      await showToast({ style: Toast.Style.Success, title: `Re-authenticated ${entry.orgName}` });
      await reload();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Re-authentication failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function logOut(entry: WorkspaceEntry, options: { revoke: boolean }) {
    const confirmed = await confirmAlert({
      title: options.revoke ? `Log Out and Revoke ${entry.orgName}?` : `Log Out of ${entry.orgName}?`,
      message: options.revoke
        ? // S7 blast radius, disclosed verbatim: authorization-scoped + eventually consistent
          // (observed: ~10 s clean case, 8–12 min worst case).
          "Revoking at Linear invalidates every Raycast token for this account and workspace — including the primary Linear login if it uses the same account and workspace — and can take from seconds up to ~12 minutes to land. A workspace re-added during that window may be logged out again when the revocation lands."
        : "Removes this workspace's login from Raycast. The authorization at Linear stays (remove it at linear.app under Security & access if you want); its current access token expires on its own within 24 hours.",
      primaryAction: {
        title: options.revoke ? "Log Out and Revoke" : "Log Out",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    const ref: EntryRef = { orgId: entry.orgId, userId: entry.userId };
    // Named-step tracker: logOut had no error handling at all, so a throw anywhere in this
    // sequence (e.g. removeTokens or the registry write) silently left the entry behind,
    // reporting "removed" via Settings while Manage Workspaces still showed it needing
    // re-authentication. Every await below updates `step` first so a failure toast can say
    // which part of the log-out actually failed.
    let step = "removing the local login";
    try {
      const service = getServiceForProviderId(entry.providerId, undefined, `Linear — ${entry.orgName}`);
      let revoked = false;
      if (options.revoke) {
        step = "revoking access at Linear";
        const tokens = await service.client.getTokens();
        if (tokens?.accessToken) revoked = await revokeAtLinear(tokens.accessToken);
      }
      step = "removing the stored token";
      await service.client.removeTokens(); // default: local deletion (S7)
      step = "removing the workspace from the list";
      await removeWorkspaceEntry(ref);
      clearWorkspaceNotificationsCache(); // drop this entry's cached notification rows now, not at the next 15-min refresh
      let after = await readRegistry();
      if (after.workspaces.some((w) => entryKey(w) === entryKey(ref))) {
        // Removal did not persist — retry once before treating it as a hard failure.
        await removeWorkspaceEntry(ref);
        after = await readRegistry();
        if (after.workspaces.some((w) => entryKey(w) === entryKey(ref))) {
          throw new Error(`Removing ${entry.orgName} from the workspace list did not persist.`);
        }
      }
      step = "refreshing the workspace list";
      const fresh = await migrateIfNeeded({ allowWrite: true });
      const nextActive = getActiveEntry(fresh);
      await showToast({
        style: Toast.Style.Success,
        title: options.revoke
          ? revoked
            ? `Removed from Raycast; revocation requested at Linear`
            : `Removed from Raycast (revoke request failed)`
          : `Logged out of ${entry.orgName}`,
        message: nextActive ? `Active workspace: ${nextActive.orgName}` : undefined,
      });
      refreshQuickCommandSubtitles(); // fire-and-forget: workspace membership changed, subtitles listing "others" are now stale
      await reload();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Logging out of ${entry.orgName} failed while ${step}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function logOutAll() {
    const confirmed = await confirmAlert({
      title: "Log Out of All Workspaces?",
      message:
        "Removes every workspace login from Raycast (tokens are deleted locally; each access token expires at Linear on its own within 24 hours).",
      primaryAction: { title: "Log Out of All", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const failed: string[] = [];
    for (const row of rows) {
      let step = "removing the stored token";
      try {
        const service = getServiceForProviderId(row.entry.providerId, undefined, `Linear — ${row.entry.orgName}`);
        await service.client.removeTokens();
        step = "removing the workspace from the list";
        await removeWorkspaceEntry({ orgId: row.entry.orgId, userId: row.entry.userId });
      } catch (error) {
        failed.push(`${row.entry.orgName} (${step}: ${error instanceof Error ? error.message : String(error)})`);
      }
    }
    clearWorkspaceNotificationsCache(); // drop every workspace's cached notification rows now, not at the next 15-min refresh
    if (failed.length === 0) {
      await showToast({ style: Toast.Style.Success, title: "Logged out of all workspaces" });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: `Logged out of ${rows.length - failed.length} of ${rows.length} workspaces`,
        message: `Failed: ${failed.join("; ")}`,
      });
    }
    refreshQuickCommandSubtitles(); // fire-and-forget: workspace membership changed, subtitles listing "others" are now stale
    await reload();
  }

  const activeEntry = registry ? getActiveEntry(registry) : null;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter workspaces">
      <List.EmptyView
        title="No Workspaces Connected"
        description="Add a Linear workspace to get started."
        actions={
          <ActionPanel>
            <Action title="Add Workspace" icon={Icon.Plus} onAction={addWorkspace} />
          </ActionPanel>
        }
      />
      {rows.map(({ entry, hasToken }) => {
        const isActive = activeEntry !== null && entryKey(activeEntry) === entryKey(entry);
        const ref: EntryRef = { orgId: entry.orgId, userId: entry.userId };
        return (
          <List.Item
            key={entryKey(entry)}
            icon={Icon.PersonCircle}
            title={entry.orgName}
            subtitle={entry.userEmail}
            accessories={
              hasToken
                ? isActive
                  ? [{ tag: { value: "Active", color: Color.Green } }]
                  : []
                : [{ tag: { value: "Needs re-authentication", color: Color.Orange } }]
            }
            actions={
              <ActionPanel>
                {hasToken && !isActive ? (
                  <Action
                    title="Set Active"
                    icon={Icon.CheckCircle}
                    onAction={async () => {
                      await setActiveEntry(ref);
                      refreshQuickCommandSubtitles(); // fire-and-forget: the active workspace changed, subtitles pegged to it are now stale
                      await reload();
                    }}
                  />
                ) : null}
                {!hasToken ? (
                  <Action title="Re-Authenticate" icon={Icon.Key} onAction={() => reauthenticate(entry)} />
                ) : null}
                <Action
                  title="Add Workspace"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={addWorkspace}
                />
                <Action
                  title="Log out of This Workspace"
                  icon={Icon.Logout}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => logOut(entry, { revoke: false })}
                />
                <Action
                  title="Log out and Revoke at Linear"
                  icon={Icon.ExclamationMark}
                  style={Action.Style.Destructive}
                  onAction={() => logOut(entry, { revoke: true })}
                />
                <Action
                  title="Log out of All Workspaces"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                  onAction={logOutAll}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
