import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

export function MissingMint() {
  return (
    <Detail
      markdown={`# Mint CLI not found

Install the direct edition of Mint, launch it once from Finder, and then return to this command. Mint links its bundled CLI into \`/opt/homebrew/bin\` or \`/usr/local/bin\` without overwriting files it did not create.

This extension only runs read-only status, scan, and explanation commands. File cleanup remains inside Mint's review and journal workflow.`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Download Mint" icon={Icon.Download} url="https://mint.dzgapp.com" />
          <Action.OpenInBrowser title="Read CLI Documentation" url="https://mint.dzgapp.com/docs#cli-overview" />
        </ActionPanel>
      }
    />
  );
}
