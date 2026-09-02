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
import { fetchViewerIdentity, getServiceForProviderId, stagingService, ViewerIdentity } from "./api/oauth";
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

// Written when addWorkspace starts an interactive grant, cleared once completeAddFromStaging
// reaches a definitive outcome for that token (success or a proven-bad token) — see fix F-3.
// Gates the MOUNT-TIME recovery call so a stray staging token can't be replayed as an
// implicit "add" on every open of Manage Workspaces.
const ADD_IN_FLIGHT_KEY = "staging-add-in-flight";

// fetchViewerIdentity's error messages embed the HTTP status ("HTTP 401"). A 401/403 means
// the staging token itself was rejected (permanent); anything else (network failure, 5xx) is
// treated as transient so a stranded-but-still-good token survives to be retried.
function isPermanentTokenFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /HTTP (401|403)/.test(message);
}

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

  // Finish an interrupted add: registry write from an authorized staging token (§4.1 step 5).
  // Ordering fix (F-2): the token is VERIFIED before anything is written to the registry —
  // the original order wrote the entry first and verified after, so a failure between those
  // two steps left a token-less entry behind that a stray staging token would keep resurrecting
  // on every subsequent mount.
  const completeAddFromStaging = useCallback(async () => {
    const stagingTokens = await stagingService.client.getTokens();
    if (!stagingTokens?.accessToken) {
      // Nothing staged — clear a stale in-flight marker from a crash before any grant landed.
      await LocalStorage.removeItem(ADD_IN_FLIGHT_KEY);
      return false;
    }

    let identity: ViewerIdentity;
    try {
      identity = await fetchViewerIdentity(stagingTokens.accessToken);
      // Second, SDK-path verification of the same token before it is ever written anywhere.
      await makeClient(stagingTokens.accessToken).viewer;
    } catch (error) {
      if (isPermanentTokenFailure(error)) {
        // The token itself is rejected (permanent failure) — clear it so a dead token
        // doesn't keep silently failing on every future mount.
        await stagingService.client.removeTokens();
        await LocalStorage.removeItem(ADD_IN_FLIGHT_KEY);
      }
      // A transient failure (network, 5xx) leaves staging untouched so recovery can retry.
      throw error;
    }

    const { entry, isNew } = await upsertWorkspaceEntry(identity);
    const destination = getServiceForProviderId(entry.providerId, undefined, `Linear — ${entry.orgName}`);
    // setTokens re-stamps updatedAt to NOW, so pass the REMAINING lifetime, not the
    // original duration — crash recovery can run hours after the grant, and copying the
    // full duration would make isExpired() lag the server's fixed expiry. Omit expiresIn
    // entirely when the stored set lacks it (do not default it — that would make a
    // non-expiring token look expiring).
    const elapsedSeconds = Math.floor((Date.now() - stagingTokens.updatedAt.getTime()) / 1000);
    try {
      await destination.client.setTokens({
        accessToken: stagingTokens.accessToken,
        refreshToken: stagingTokens.refreshToken,
        idToken: stagingTokens.idToken,
        scope: stagingTokens.scope,
        ...(stagingTokens.expiresIn !== undefined
          ? { expiresIn: Math.max(60, stagingTokens.expiresIn - elapsedSeconds) }
          : {}),
      });
    } finally {
      // The identity is verified and the entry is written by this point — the staging
      // token must not linger regardless of whether setTokens itself succeeded.
      await stagingService.client.removeTokens();
      await LocalStorage.removeItem(ADD_IN_FLIGHT_KEY);
    }
    await showToast({
      style: Toast.Style.Success,
      title: isNew ? `Added ${identity.orgName}` : `Re-authenticated ${identity.orgName}`,
      message: identity.userEmail,
    });
    refreshQuickCommandSubtitles(); // fire-and-forget: workspace membership changed, subtitles listing "others" are now stale
    return true;
  }, []);

  useEffect(() => {
    (async () => {
      // Crash/cancel recovery on mount: only resume an add the user actually started (F-3) —
      // a stray staging token must never be replayed as an implicit "add" on every mount.
      try {
        const addInFlight = await LocalStorage.getItem<string>(ADD_IN_FLIGHT_KEY);
        if (addInFlight) {
          await completeAddFromStaging();
        }
      } catch {
        // Leave staging for the next attempt; never crash the management surface.
      }
      await reload();
    })();
  }, [completeAddFromStaging, reload]);

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
      await stagingService.client.removeTokens(); // clear any prior abort (§4.1 step 1)
      // Mark that an add is genuinely in flight, so a crash before this completes still lets
      // mount-time recovery resume it (F-3) — cleared inside completeAddFromStaging once the
      // token is proven good or proven bad.
      await LocalStorage.setItem(ADD_IN_FLIGHT_KEY, "1");
      await stagingService.authorize(); // interactive; prompt=consent forces the consent screen
      await completeAddFromStaging();
      await reload();
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
    clearWorkspaceNotificationsCache(); // drop this entry's cached notification rows now, not at the next 15-min refresh
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
