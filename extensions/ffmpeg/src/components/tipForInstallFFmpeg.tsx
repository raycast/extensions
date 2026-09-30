import { Detail } from "@raycast/api";
import { Action, ActionPanel } from "@raycast/api";

export function TipForInstallFFmpeg() {
  const content = `
# Welcome to FFmpeg

Before you can start using this plugin please install [FFmpeg](https://ffmpeg.org).

__Instructions__:

1. Open Terminal.
2. If you haven't already, install [Homebrew](https://brew.sh/).
3. Run \`brew install ffmpeg\`.
4. That's it! You can now use this plugin.

_Alternatively, you can download FFmpeg straight from the [official website](https://ffmpeg.org/download.html) rather than using Homebrew._
`;

  return (
    <Detail
      markdown={content}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Command to Install FFmpeg" content={`brew install ffmpeg`} />
            <Action.CopyToClipboard
              title="Copy Command to Install Homebrew"
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
