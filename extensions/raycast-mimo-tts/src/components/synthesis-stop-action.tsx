import { Action, Icon } from "@raycast/api";

export function SynthesisStopAction({ isLoading, onStop }: { isLoading: boolean; onStop: () => void }) {
  if (!isLoading) return null;

  return (
    <Action title="Stop Playback" icon={Icon.Stop} shortcut={{ modifiers: ["cmd"], key: "." }} onAction={onStop} />
  );
}
