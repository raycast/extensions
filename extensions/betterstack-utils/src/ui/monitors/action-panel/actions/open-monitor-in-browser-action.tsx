import { Action, Keyboard } from "@raycast/api";

type OpenMonitorInBrowserActionProps = {
  url: string;
};

export function OpenMonitorInBrowserAction({ url }: OpenMonitorInBrowserActionProps) {
  return <Action.OpenInBrowser title="Open in Browser" url={url} shortcut={Keyboard.Shortcut.Common.OpenWith} />;
}
