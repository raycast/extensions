import { Action, Keyboard } from "@raycast/api";

export default function OpenInTally({ route }: { route: string }) {
  return (
    <Action.OpenInBrowser
      icon="tally.png"
      title="Open in Tally"
      url={`https://tally.so/${route}`}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}
