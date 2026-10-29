import { Detail, ActionPanel, Action, Icon } from "@raycast/api";

export default function FfmpegMissing() {
  const windows = process.platform === "win32";
  const command = windows ? "winget install --id Gyan.FFmpeg --exact" : "brew install ffmpeg";
  return (
    <Detail
      markdown={`# FFmpeg or ffprobe Not Found

Video conversion requires both **FFmpeg** and **ffprobe**.

## Install on ${windows ? "Windows" : "macOS"}

Run in ${windows ? "PowerShell" : "Terminal"}:

\`\`\`sh
${command}
\`\`\`

Alternatively, download a full build from [FFmpeg Downloads](https://ffmpeg.org/download.html), extract it, and add the folder containing **${windows ? "ffmpeg.exe and ffprobe.exe" : "ffmpeg and ffprobe"}** to PATH.

Use a build with libx264, libx265, libvpx and libopus. For custom locations, set FFMPEG_PATH and FFPROBE_PATH to the full executable paths.

Restart Raycast after installation or changing PATH.`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Installation Command" content={command} icon={Icon.Clipboard} />
          <Action.OpenInBrowser title="Ffmpeg Downloads" url="https://ffmpeg.org/download.html" />
        </ActionPanel>
      }
    />
  );
}
