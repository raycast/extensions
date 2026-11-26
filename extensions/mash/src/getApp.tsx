import { Action, Icon } from "@raycast/api";

/** Where the Mash desktop app, which opens chats, is downloaded; offered to readers without it. */
export function GetApp() {
  return <Action.OpenInBrowser title="Get the Mash App" icon={Icon.Download} url="https://getmash.io/downloads/" />;
}
