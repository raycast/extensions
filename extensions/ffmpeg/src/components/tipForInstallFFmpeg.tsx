import { Detail } from "@raycast/api";
import { Action, ActionPanel, useNavigation } from "@raycast/api";

export function TipForInstallFFmpeg() {
  const content = `# FFmpeg Tip - Install dependencies

**Unable to detect a local FFmpeg installation. Please install this dependency to use this plugin.**

Instructions for installing FFmpeg on macOS:

1. Open Terminal.
2. If you haven't already install Homebrew, by entering the following command in Terminal: 
\`\`\`
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
\`\`\`
3. Once you've installed Homebrew, you can install FFmpeg by typing in the following command:
\`\`\`
brew install ffmpeg
\`\`\`

After the installation is complete, you should be able to use the plugin.

------

Of course, you can also download it from the FFmpeg official website, please visit https://ffmpeg.org/download.html

`;

  return (
    <Detail
      markdown={content}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy install FFmpeg command" content={`brew install ffmpeg`} />
            <Action.CopyToClipboard
              title="Copy install Homebrew command"
              content={`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="References">
            <Action.OpenInBrowser title="FFmpeg" url="https://ffmpeg.org/" />
            <Action.OpenInBrowser title="Homebrew" url="https://brew.sh/" />
            <Action.OpenInBrowser
              title="Homebrew FFmpeg Package"
              url="https://formulae.brew.sh/formula/ffmpeg#default"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
