import { Action, Icon } from "@raycast/api";
import { turnOnMenuBar } from "./runtime.ts";

export function TurnOnMenuBarAction({ onDone }: { onDone: () => void }) {
  return <Action title="Turn on Menu Bar Stats" icon={Icon.Power} onAction={() => turnOnMenuBar().then(onDone)} />;
}
