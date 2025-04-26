import { Detail, Action, ActionPanel } from "@raycast/api";
import { LocalStorage } from "@raycast/api";

export function HelloPage({ onContinue }: { onContinue: () => void }) {
  return (
    <Detail
      markdown={`
# Welcome to Media Converter!

This extension allows you to easily convert between different media formats using FFmpeg.

## Features:
- Simple one-click conversion
- Support for multiple files at once
- Video formats: MP4, AVI, MKV, MOV, MPG, WEBM
- Image formats: JPG, PNG, WebP
- Audio formats: MP3, AAC, WAV, FLAC
- Automatic FFmpeg installation if not present
- Preserves original file quality

## How to use:
1. Select one or more files of the same type (video, image, or audio)
2. Choose your desired output format
3. Click Convert or press ⌘↵

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
