import { Action, Keyboard } from "@raycast/api";

type OpenScheduleInBrowserActionProps = {
  url: string;
};

export function OpenScheduleInBrowserAction({ url }: OpenScheduleInBrowserActionProps) {
  return (
    <Action.OpenInBrowser title="Open Schedule in Browser" url={url} shortcut={Keyboard.Shortcut.Common.OpenWith} />
  );
}
