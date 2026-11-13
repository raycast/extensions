import { Action, Keyboard } from "@raycast/api";

type OpenStatusPageInBrowserActionProps = {
  url: string;
};

export function OpenStatusPageInBrowserAction({ url }: OpenStatusPageInBrowserActionProps) {
  return <Action.OpenInBrowser title="Open in Browser" url={url} shortcut={Keyboard.Shortcut.Common.OpenWith} />;
}
