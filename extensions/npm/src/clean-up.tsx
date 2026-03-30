import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Icon,
  confirmAlert,
} from "@raycast/api";
import {
  buildCleanCacheCommand,
  buildVerifyCacheCommand,
  cleanNpmCache,
  verifyNpmCache,
} from "./lib/npm";

const markdown = `
# npm Clean Up

npm does not have a direct equivalent to Homebrew's package cleanup for old installed versions.

What it *does* support is cache maintenance:

- **Verify Cache**: runs \`npm cache verify\` to garbage collect unneeded cache data and validate integrity.
- **Clear Cache**: runs \`npm cache clean --force\` to remove the cache entirely.

The recommended option is **Verify Cache**.
`;

export default function CleanUpCommand() {
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Verify Cache"
            icon={Icon.CheckCircle}
            onAction={async () => {
              await verifyNpmCache();
            }}
          />
          <Action
            title="Clear Cache"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: "Clear the npm cache?",
                message:
                  "This removes cached package data and forces npm to download it again later.",
                primaryAction: {
                  title: "Clear Cache",
                  style: Alert.ActionStyle.Destructive,
                },
              });

              if (!confirmed) {
                return;
              }

              await cleanNpmCache();
            }}
          />
          <Action.OpenInBrowser
            title="Open npm Cache Docs"
            url="https://docs.npmjs.com/cli/v11/commands/npm-cache"
          />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Verify Command"
              content={buildVerifyCacheCommand()}
            />
            <Action.CopyToClipboard
              title="Copy Clear Cache Command"
              content={buildCleanCacheCommand()}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
