import { Detail, ActionPanel, Action, open, Icon } from "@raycast/api";

export default function FfmpegMissing() {
  const brewCmd = "brew install ffmpeg";

  return (
    <Detail
      markdown={`
# 🎥 FFmpeg Not Found

Raycast couldn't locate **FFmpeg** on your system. FFmpeg is required for video conversion.

## 🔧 Installation Options

### Option 1: Using Homebrew (Recommended)
\`\`\`bash
${brewCmd}
\`\`\`

### Option 2: Manual Installation
1. Download FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html)
2. Extract the archive
3. Add FFmpeg to your system PATH

## ℹ️ About FFmpeg
FFmpeg is a powerful command-line tool for processing video and audio files. It's used by this extension to:
- Convert videos between different formats
- Adjust video quality and size
- Replace audio tracks
- Apply hardware acceleration

## 🚀 After Installation
After installing FFmpeg, please restart Raycast to ensure the extension can detect it.
      `}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Homebrew Command" content={brewCmd} icon={Icon.Clipboard} />

          <Action
            title="Run in Terminal"
            onAction={() => open(`terminal:///${encodeURIComponent(brewCmd)}`)}
            icon={Icon.Terminal}
          />

          <Action.OpenInBrowser title="Homebrew Installation Guide" url="https://brew.sh/" icon={Icon.Globe} />

          <Action.OpenInBrowser
            title="Ffmpeg Documentation"
            url="https://ffmpeg.org/documentation.html"
            icon={Icon.Book}
          />
        </ActionPanel>
      }
    />
  );
}
