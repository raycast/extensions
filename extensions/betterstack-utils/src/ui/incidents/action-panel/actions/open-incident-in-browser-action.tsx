import { Action, Keyboard } from "@raycast/api";

type OpenIncidentInBrowserActionProps = {
  url: string;
};

export function OpenIncidentInBrowserAction({ url }: OpenIncidentInBrowserActionProps) {
  return <Action.OpenInBrowser title="Open in Browser" url={url} shortcut={Keyboard.Shortcut.Common.OpenWith} />;
}
