import { Action, closeMainWindow, Icon, open, PopToRootType } from "@raycast/api";

// A thin wrapper around opening a URL in the system default browser, rather
// than `Action.OpenInBrowser` directly: this needs to force an immediate pop
// to root (see OpenTabAction), which the built-in action does not expose.
const OpenInDefaultBrowserAction = (props: { url: string; title?: string }) => (
  <Action
    title={props.title ?? "Open in Default Browser"}
    icon={Icon.Globe}
    onAction={async () => {
      await open(props.url);
      await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    }}
  />
);

export default OpenInDefaultBrowserAction;
