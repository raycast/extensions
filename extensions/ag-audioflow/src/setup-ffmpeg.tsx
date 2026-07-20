import { ActionPanel, Action, Detail, showToast, Toast, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { AudioProcessor } from "./utils/audioProcessor";

export default function SetupFFmpeg() {
  const [isLoading, setIsLoading] = useState(true);
  const [ffmpegAvailable, setFFmpegAvailable] = useState(false);

  useEffect(() => {
    checkFFmpegStatus();
  }, []);

  async function checkFFmpegStatus() {
    setIsLoading(true);
    const available = await AudioProcessor.checkFFmpegAvailability();
    setFFmpegAvailable(available);
    setIsLoading(false);
  }

  async function copyInstallCommand() {
    await Clipboard.copy("brew install ffmpeg");
    showToast({
      style: Toast.Style.Success,
      title: "Command Copied",
      message: "Paste in Terminal and press Enter to install FFmpeg",
    });
  }

  const markdown = ffmpegAvailable
    ? `# ✅ FFmpeg is Ready!

AG AudioFlow is ready to use. FFmpeg is properly installed and available.

## What You Can Do Now:
- Convert audio formats (WAV, MP3, AAC, FLAC, OGG)
- Adjust volume and normalize audio levels
- Trim silence and add fade effects  
- Split stereo files or convert to mono
- Change audio speed with pitch preservation
- Process multiple files in batch mode
- View detailed audio file information

Select audio files in Finder and run any AG AudioFlow command to get started!`
    : `# 🔧 FFmpeg Setup Required

AG AudioFlow requires FFmpeg to process audio files. FFmpeg is a powerful, open-source multimedia framework used by professionals worldwide.

## Installation Options:

### Option 1: Homebrew (Recommended)
\`\`\`bash
brew install ffmpeg
\`\`\`

### Option 2: MacPorts
\`\`\`bash
sudo port install ffmpeg
\`\`\`

### Option 3: Manual Installation
1. Visit [ffmpeg.org/download.html](https://ffmpeg.org/download.html)
2. Download the macOS build
3. Extract and add to your system PATH

## After Installation:
1. Restart Terminal
2. Verify with: \`ffmpeg -version\`
3. Refresh this page to confirm setup

## Why FFmpeg?
- Industry-standard audio/video processing
- Supports all major audio formats
- High-quality conversion algorithms
- Used by Netflix, YouTube, and other major platforms
- Free and open-source

## Troubleshooting:
- If Homebrew isn't installed: \`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"\`
- Permission issues: Run commands with appropriate permissions
- PATH issues: Restart Terminal after installation`;

  if (isLoading) {
    return <Detail isLoading={true} markdown="Checking FFmpeg installation..." />;
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh Status" onAction={checkFFmpegStatus} />
          {!ffmpegAvailable && (
            <>
              <Action title="Copy Install Command" onAction={copyInstallCommand} />
              <Action.OpenInBrowser title="Visit Ffmpeg Website" url="https://ffmpeg.org/download.html" />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
