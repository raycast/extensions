import { Detail, Action, ActionPanel } from "@raycast/api";
import { LocalStorage } from "@raycast/api";

export function HelloPage({ onContinue }: { onContinue: () => void }) {
  return (
    <Detail
      markdown={`
# Welcome to MOV to MP4 Converter!

This extension allows you to easily convert MOV files to MP4 format using FFmpeg.

## Features:
- Simple one-click conversion
- Automatic FFmpeg installation if not present
- Preserves original file quality

To get started, click the Continue button below or press ⏎.

Enjoy using the converter!
      `}
      actions={
        <ActionPanel>
          <Action
            title="Continue"
            onAction={async () => {
              await LocalStorage.setItem("hasSeenHelloPage", "true");
              onContinue();
            }}
            shortcut={{ modifiers: [], key: "return" }}
          />
        </ActionPanel>
      }
    />
  );
}