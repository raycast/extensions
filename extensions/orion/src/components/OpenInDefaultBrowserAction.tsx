import { Action, closeMainWindow, Icon, open, PopToRootType } from "@raycast/api";

// A thin wrapper around opening a URL in the system default browser, rather
// than `Action.OpenInBrowser` directly: this needs to optionally force an
// immediate pop to root (see OpenTabAction), which the built-in action does
// not expose. `immediatePopToRoot` is opt-in - only the Command Bar passes
// it, while the standalone commands that also render this action keep
// respecting the user's own preference.
const OpenInDefaultBrowserAction = (props: { url: string; title?: string; immediatePopToRoot?: boolean }) => (
  <Action
    title={props.title ?? "Open in Default Browser"}
    icon={Icon.Globe}
    onAction={async () => {
      await open(props.url);
      await closeMainWindow({
        clearRootSearch: true,
        ...(props.immediatePopToRoot ? { popToRootType: PopToRootType.Immediate } : {}),
      });
    }}
  />
);

export default OpenInDefaultBrowserAction;
