import { Action, Keyboard } from "@raycast/api";
import { APP_URL } from "../utils/constants";

export default function OpenInUnkey({ route }: { route: string }) {
  const url = new URL(route, APP_URL).toString();
  return (
    <Action.OpenInBrowser icon="unkey.png" title="Open in Unkey" url={url} shortcut={Keyboard.Shortcut.Common.Open} />
  );
}
