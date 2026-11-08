import { Action, ActionPanel, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { errorMessage, isAppMissing, isSnapshotMissing } from "../lib/errors";
import { summaryText } from "../lib/limits";
import { failedRefreshes } from "../lib/usage";
import { loadUsage, refreshUsage } from "../lib/store";
import { ProviderUsage } from "../lib/types";
import { percentMode } from "../lib/ui";
import { applyPrefs } from "../lib/provider-prefs";
import { DownloadCodexBarAction, OpenCodexBarAction } from "./app-actions";
import { CreateQuicklinkAction, ManageProvidersAction, useProviderPrefs } from "./providers";

export interface UsageLaunchContext {
  provider?: string;
}

/** Shared data flow for the usage commands: instant snapshot load plus a slow CLI refresh. */
export function useUsage(only?: string) {
  const mode = percentMode();
  const layout = useProviderPrefs();
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, error, mutate } = useCachedPromise(loadUsage, [], {
    keepPreviousData: true,
    failureToastOptions: { title: "Could not read CodexBar usage" },
  });

  async function refresh() {
    setRefreshing(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing usage",
      message: "Asking every provider, this can take ~30s",
    });
    try {
      const fresh = await mutate(refreshUsage(), { shouldRevalidateAfter: false });
      const failed = failedRefreshes(fresh ?? []);
      if (failed.length > 0) {
        toast.style = Toast.Style.Failure;
        toast.title = `Could not refresh ${failed.join(", ")}`;
        toast.message = "Showing the last known usage for those providers";
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Usage refreshed";
        toast.message = undefined;
      }
    } catch (refreshError) {
      await toast.hide();
      await showFailureToast(refreshError, { title: "Refresh failed" });
    } finally {
      setRefreshing(false);
    }
  }

  return {
    /** Every provider CodexBar reports, before the user's layout is applied. */
    all: data,
    data: data ? applyPrefs(data, layout.prefs, only) : undefined,
    isLoading: isLoading || refreshing || layout.isLoading,
    error,
    refresh,
    mode,
    reloadLayout: layout.revalidate,
  };
}

export function UsageActions(props: {
  data: ProviderUsage[] | undefined;
  all?: ProviderUsage[];
  onRefresh: () => void;
  onLayoutChange?: () => void;
  quicklinkFor?: ProviderUsage[];
  /** True when these are the whole panel: Refresh becomes the primary action (↵). */
  standalone?: boolean;
}) {
  const quicklinks = props.quicklinkFor ?? [];
  // Raycast binds the first two actions to ↵ and ⌘↵, so shortcuts only go on later ones.
  const refresh = (
    <Action
      title="Refresh from Providers"
      icon={Icon.ArrowClockwise}
      shortcut={props.standalone ? undefined : Keyboard.Shortcut.Common.Refresh}
      onAction={props.onRefresh}
    />
  );
  return (
    <>
      {props.standalone && refresh}
      <OpenCodexBarAction />
      {!props.standalone && refresh}
      <Action.CopyToClipboard
        title="Copy Summary"
        content={summaryText(props.data ?? [], percentMode())}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      {props.all && props.onLayoutChange && (
        <ManageProvidersAction providers={props.all} onChange={props.onLayoutChange} />
      )}
      {quicklinks.length === 1 && <CreateQuicklinkAction {...quicklinks[0]} />}
      {quicklinks.length > 1 && (
        <ActionPanel.Submenu title="Create Quicklink for…" icon={Icon.Link}>
          {quicklinks.map((usage) => (
            <CreateQuicklinkAction key={usage.provider} {...usage} />
          ))}
        </ActionPanel.Submenu>
      )}
    </>
  );
}

/** Full-screen empty state for a load error with no cached data. */
export function UsageErrorView(props: { error: unknown; data: ProviderUsage[] | undefined; onRefresh: () => void }) {
  const appMissing = isAppMissing(props.error);
  const snapshotMissing = isSnapshotMissing(props.error);
  return (
    <List>
      <List.EmptyView
        icon={Icon.Warning}
        title={
          appMissing ? "CodexBar Is Not Installed" : snapshotMissing ? "No Usage Data Yet" : "Something Went Wrong"
        }
        description={
          appMissing
            ? "Install the CodexBar menu bar app to see your plan limits here."
            : snapshotMissing
              ? "Open CodexBar and let it refresh once, or press ⌘R to fetch usage through its CLI."
              : errorMessage(props.error)
        }
        actions={
          <ActionPanel>
            {appMissing ? (
              <DownloadCodexBarAction />
            ) : (
              <UsageActions data={props.data} onRefresh={props.onRefresh} standalone />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}
