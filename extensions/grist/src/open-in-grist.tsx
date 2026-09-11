import { Action, Keyboard } from "@raycast/api";
import { buildGristUrl } from "./grist";

export default function OpenInGrist({ route }: { route: string }) {
  return (
    <Action.OpenInBrowser
      icon="grist.png"
      title="Open in Grist"
      url={buildGristUrl(route)}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}
