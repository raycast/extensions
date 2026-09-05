import {
  Action,
  ActionPanel,
  Detail,
  openExtensionPreferences,
} from "@raycast/api";

export function SparkNotInstalled() {
  const markdown = `# Spark CLI not found

This extension drives the **Spark Mail CLI** (\`spark\`). I couldn't find the binary.

1. Open **Spark Desktop** → **Settings → AI Agents → Spark CLI Setup** and follow the prompts.
2. Confirm the install path in Terminal: \`which spark\`
3. If it's somewhere non-standard, set **Spark CLI Path** in this extension's preferences.
`;
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
