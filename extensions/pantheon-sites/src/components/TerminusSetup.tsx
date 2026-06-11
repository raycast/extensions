import { ActionPanel, Detail, Action, Icon, openExtensionPreferences } from "@raycast/api";

const SETUP_MARKDOWN = `
# Terminus Not Found

This extension requires **Terminus**, the Pantheon CLI tool.

## Install via Homebrew *(recommended)*
\`\`\`
brew install pantheon-systems/external/terminus
\`\`\`

## Install via Composer
\`\`\`
composer global require pantheon-systems/terminus
\`\`\`

---

Once installed, authenticate your Pantheon account:
\`\`\`
terminus auth:login
\`\`\`
`;

export function TerminusSetup() {
  return (
    <Detail
      markdown={SETUP_MARKDOWN}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link
            title="Installation Guide"
            target="https://pantheon.io/docs/terminus/install"
            text="View on pantheon.io"
          />
          <Detail.Metadata.Link
            title="Terminus on GitHub"
            target="https://github.com/pantheon-systems/terminus"
            text="pantheon-systems/terminus"
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Custom Path" text="Extension Preferences → Terminus Path" icon={Icon.Gear} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            icon={Icon.Book}
            title="View Installation Docs"
            url="https://pantheon.io/docs/terminus/install"
          />
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
