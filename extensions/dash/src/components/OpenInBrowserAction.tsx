import { Action } from "@raycast/api";

export default function OpenInBrowserAction() {
  return (
    <Action.OpenInBrowser title="Get Dash" shortcut={{ modifiers: ["cmd"], key: "g" }} url="https://kapeli.com/dash" />
  );
}
