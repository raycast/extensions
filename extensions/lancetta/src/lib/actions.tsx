import { Action, ActionPanel, Icon, Keyboard, List, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { DOWNLOAD_URL, OVERVIEW_URL } from "./snapshot";

/**
 * `usePromise` options for a loader whose error the command draws itself, as its empty view:
 * without them `@raycast/utils` puts the same error up again as a "Failed to fetch" toast.
 */
export const ERROR_IN_VIEW = { onError: () => undefined };

/**
 * What every command shows on a Mac where Lancetta has never run: the extension reads the app's
 * files and has nothing of its own, so the one thing to do is get the app.
 */
export function LancettaMissingView(props: { onRefresh: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.Download}
      title="Lancetta Has Not Run on This Mac"
      description="This extension shows what the free Lancetta menu bar app reads. Install it, or launch it once."
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Download Lancetta" url={DOWNLOAD_URL} />
          <RefreshAction onRefresh={props.onRefresh} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Opens Lancetta's window, the one URL the app answers. With another title it stands for an
 * action only the app can take (spending a free reset, reclaiming orphaned processes); the
 * plain one carries the Open shortcut.
 */
export function OpenLancettaAction(props: { title?: string; icon?: Icon }) {
  return (
    <Action
      title={props.title ?? "Open Lancetta"}
      icon={props.icon ?? Icon.AppWindowSidebarLeft}
      onAction={async () => {
        try {
          await open(OVERVIEW_URL);
        } catch (e) {
          await showFailureToast(e, {
            title: "Could not open Lancetta",
            primaryAction: { title: "Download Lancetta", onAction: () => open(DOWNLOAD_URL) },
          });
        }
      }}
      shortcut={props.title ? undefined : Keyboard.Shortcut.Common.Open}
    />
  );
}

export function RefreshAction(props: { onRefresh: () => void }) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      onAction={props.onRefresh}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );
}
