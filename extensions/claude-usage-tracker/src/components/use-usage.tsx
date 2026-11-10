import { Action, ActionPanel, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { errorMessage, isAppMissing, isDataMissing } from "../lib/errors";
import { formatDuration } from "../lib/format";
import { summaryText } from "../lib/limits";
import { applyPrefs } from "../lib/profile-prefs";
import { staleProfiles } from "../lib/profiles";
import { loadUsage } from "../lib/store";
import { ProfileUsage } from "../lib/types";
import { percentMode } from "../lib/ui";
import { DownloadClaudeUsageAction, OpenClaudeUsageAction } from "./app-actions";
import { CreateQuicklinkAction, ManageProfilesAction, useProfilePrefs } from "./profiles";

export interface UsageLaunchContext {
  profile?: string;
}

/** Claude Usage rewrites its reading every 30s by default; re-read it at the same rhythm. */
const RELOAD_INTERVAL_MS = 30_000;

export function staleMessage(usage: ProfileUsage, now: Date): string {
  return usage.updatedAt
    ? `Last updated ${formatDuration(now.getTime() - usage.updatedAt.getTime())} ago`
    : "Never updated";
}

/** Shared data flow for the usage commands: reads what the menu bar app last saved. */
export function useUsage(only?: string) {
  const mode = percentMode();
  const layout = useProfilePrefs();
  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(loadUsage, [], {
    keepPreviousData: true,
    failureToastOptions: { title: "Could not read Claude Usage data" },
  });

  useEffect(() => {
    const timer = setInterval(revalidate, RELOAD_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [revalidate]);

  const shown = data ? applyPrefs(data, layout.prefs, only) : undefined;

  async function reload() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Reloading usage" });
    try {
      const loaded: ProfileUsage[] = (await mutate(loadUsage(), { shouldRevalidateAfter: false })) ?? [];
      const fresh = applyPrefs(loaded, layout.prefs, only);
      const now = new Date();
      const stale = staleProfiles(fresh, now);
      if (stale.length > 0) {
        // The extension cannot make the app refresh: old numbers are reported, not passed off as new.
        toast.style = Toast.Style.Failure;
        toast.title = `${stale.map((usage) => usage.name).join(", ")}: ${staleMessage(stale[0], now).toLowerCase()}`;
        toast.message = "Open Claude Usage to get fresh numbers";
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Usage reloaded";
      }
    } catch (reloadError) {
      await toast.hide();
      await showFailureToast(reloadError, { title: "Could not read Claude Usage data" });
    }
  }

  return {
    /** Every profile Claude Usage knows, before the user's layout is applied. */
    all: data,
    data: shown,
    isLoading: isLoading || layout.isLoading,
    error,
    reload,
    mode,
    reloadLayout: layout.revalidate,
  };
}

export function UsageActions(props: {
  data: ProfileUsage[] | undefined;
  all?: ProfileUsage[];
  onReload: () => void;
  onLayoutChange?: () => void;
  quicklinkFor?: ProfileUsage[];
  /** True when these are the first actions of the panel, which Raycast binds to ↵ and ⌘↵. */
  standalone?: boolean;
}) {
  const quicklinks = props.quicklinkFor ?? [];
  return (
    <>
      <OpenClaudeUsageAction />
      <Action
        title="Reload Usage"
        icon={Icon.ArrowClockwise}
        shortcut={props.standalone ? undefined : Keyboard.Shortcut.Common.Refresh}
        onAction={props.onReload}
      />
      <Action.CopyToClipboard
        title="Copy Summary"
        content={summaryText(props.data ?? [], percentMode())}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      {props.all && props.onLayoutChange && (
        <ManageProfilesAction profiles={props.all} onChange={props.onLayoutChange} />
      )}
      {quicklinks.length === 1 && <CreateQuicklinkAction {...quicklinks[0]} />}
      {quicklinks.length > 1 && (
        <ActionPanel.Submenu title="Create Quicklink for…" icon={Icon.Link}>
          {quicklinks.map((usage) => (
            <CreateQuicklinkAction key={usage.profile} {...usage} />
          ))}
        </ActionPanel.Submenu>
      )}
    </>
  );
}

/** Full-screen empty state for a load error with no cached data. */
export function UsageErrorView(props: { error: unknown; onReload: () => void }) {
  const appMissing = isAppMissing(props.error);
  const dataMissing = isDataMissing(props.error);
  return (
    <List>
      <List.EmptyView
        icon={Icon.Warning}
        title={
          appMissing ? "Claude Usage Is Not Installed" : dataMissing ? "No Usage Data Yet" : "Something Went Wrong"
        }
        description={
          appMissing
            ? "Install the Claude Usage menu bar app to see your Claude limits here."
            : dataMissing
              ? "Press Return to open Claude Usage, sign in and let it refresh once."
              : errorMessage(props.error)
        }
        actions={
          <ActionPanel>
            {appMissing ? (
              <DownloadClaudeUsageAction />
            ) : (
              <UsageActions data={undefined} onReload={props.onReload} standalone />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}
