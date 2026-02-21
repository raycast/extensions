import { Action, ActionPanel, Clipboard, Detail, Toast, showToast } from "@raycast/api";
import { exportRulesAsJson } from "../lib/rules";

export default function Command() {
  const rulesJson = exportRulesAsJson();

  return (
    <Detail
      markdown={`# Velja Rules Export

\`\`\`json
${rulesJson}
\`\`\``}
      actions={
        <ActionPanel>
          <Action
            title="Copy Rules JSON"
            onAction={async () => {
              await Clipboard.copy(rulesJson);
              await showToast({ style: Toast.Style.Success, title: "Copied rules JSON" });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
