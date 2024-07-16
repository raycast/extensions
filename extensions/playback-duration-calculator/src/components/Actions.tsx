import { ActionPanel, Action } from "@raycast/api";
import { CalculationOutput } from "../utils/types";

export default function Actions({ playbackDuration, timeSaved, completionTime }: CalculationOutput) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy New Duration" content={playbackDuration} />
      <Action.CopyToClipboard title="Copy Time Saved" content={timeSaved} />
      <Action.CopyToClipboard
        title="Copy Completion Time"
        content={completionTime}
        shortcut={{ modifiers: ["opt"], key: "enter" }}
      />
    </ActionPanel>
  );
}
