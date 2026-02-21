import { Action, ActionPanel, Detail, Icon, open } from "@raycast/api";
import { formatBrowserIdentifier, getVeljaStatusSnapshot } from "../lib/velja";

function buildMarkdown() {
  const status = getVeljaStatusSnapshot();

  if (!status.installed) {
    return {
      markdown: `# Velja Status

## Installation
- **Installed:** No
- **Path:** \`/Applications/Velja.app\`

Install Velja from https://sindresorhus.com/velja and relaunch this command.`,
      hasError: true,
    };
  }

  if (!status.config) {
    return {
      markdown: `# Velja Status

## Installation
- **Installed:** Yes
- **Running:** ${status.running ? "Yes" : "No"}
- **Version:** ${status.version ?? "Unknown"}

## Error
\`\`\`
${status.error ?? "Could not read Velja preferences"}
\`\`\``,
      hasError: true,
    };
  }

  const enabledRules = status.config.rules.filter((rule) => rule.isEnabled).length;
  const disabledRules = status.config.rules.length - enabledRules;

  return {
    markdown: `# Velja Status

## App
- **Installed:** Yes
- **Running:** ${status.running ? "Yes" : "No"}
- **Version:** ${status.version ?? "Unknown"}

## Browser Configuration
- **Default Browser:** ${formatBrowserIdentifier(status.config.defaultBrowser)}
- **Alternative Browser:** ${formatBrowserIdentifier(status.config.alternativeBrowser)}
- **Preferred Browsers:** ${status.config.preferredBrowsers.length}

## Rules
- **Total Rules:** ${status.config.rules.length}
- **Enabled:** ${enabledRules}
- **Disabled:** ${disabledRules}`,
    hasError: false,
  };
}

export default function Command() {
  const { markdown } = buildMarkdown();

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Velja Website" url="https://sindresorhus.com/velja" icon={Icon.Globe} />
          <Action title="Open Velja App" icon={Icon.AppWindow} onAction={() => open("/Applications/Velja.app")} />
        </ActionPanel>
      }
    />
  );
}
