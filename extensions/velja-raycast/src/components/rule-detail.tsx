import { Action, ActionPanel, Clipboard, Detail, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { getBrowserTitle } from "../lib/browsers";
import { VeljaRule } from "../lib/types";
import { RuleBrowserPicker } from "./rule-browser-picker";

function buildRuleMarkdown(rule: VeljaRule): string {
  const matchersTable =
    rule.matchers.length === 0
      ? "_No matchers configured_"
      : ["| Kind | Pattern | Fixture |", "| --- | --- | --- |"]
          .concat(
            rule.matchers.map((matcher) => `| ${matcher.kind} | \`${matcher.pattern}\` | \`${matcher.fixture}\` |`),
          )
          .join("\n");

  const sourceApps =
    rule.sourceApps.length === 0 ? "_No source-app filters_" : rule.sourceApps.map((app) => `- \`${app}\``).join("\n");

  const transformScript =
    rule.isTransformScriptEnabled && rule.transformScript
      ? `\n## Transform Script\n\`\`\`javascript\n${rule.transformScript}\n\`\`\`\n`
      : "";

  return `# ${rule.title}

## Status
- **Enabled:** ${rule.isEnabled ? "Yes" : "No"}
- **Target Browser:** ${getBrowserTitle(rule.browser)}
- **Rule ID:** \`${rule.id}\`

## Matchers
${matchersTable}

## Source Apps
${sourceApps}

## Options
- **Force New Window:** ${rule.forceNewWindow ? "Yes" : "No"}
- **Open in Background:** ${rule.openInBackground ? "Yes" : "No"}
- **Only from AirDrop:** ${rule.onlyFromAirdrop ? "Yes" : "No"}
- **Run After Built-in Rules:** ${rule.runAfterBuiltinRules ? "Yes" : "No"}
- **Transform Script Enabled:** ${rule.isTransformScriptEnabled ? "Yes" : "No"}
${transformScript}`;
}

export function RuleDetailView(props: { rule: VeljaRule }) {
  const [rule, setRule] = useState(props.rule);
  const { push } = useNavigation();

  return (
    <Detail
      markdown={buildRuleMarkdown(rule)}
      actions={
        <ActionPanel>
          <Action
            title="Remap Target Browser"
            icon={Icon.Pencil}
            onAction={() =>
              push(
                <RuleBrowserPicker
                  rule={rule}
                  onUpdated={(updatedRule) => {
                    setRule(updatedRule);
                  }}
                />,
              )
            }
          />
          <Action
            title="Copy Rule JSON"
            onAction={async () => {
              await Clipboard.copy(JSON.stringify(rule, null, 2));
              await showToast({ style: Toast.Style.Success, title: "Copied rule JSON" });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
