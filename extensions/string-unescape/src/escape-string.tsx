import { Action, ActionPanel, Clipboard, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import jsesc from "jsesc";

export default function Command() {
  const { data, isLoading } = usePromise(async () => {
    const { text } = await Clipboard.read();
    return text;
  });
  const [jsonCompatible, setJsonCompatible] = useState(false);

  const escapedString = jsesc(data || "", {
    quotes: "double",
    wrap: false,
    minimal: true,
    json: jsonCompatible,
  });

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Escaped String" content={escapedString} />
          <ActionPanel.Submenu title="Escape Options" icon={Icon.Code}>
            <Action
              title={`Standard Escape`}
              icon={!jsonCompatible ? Icon.Check : undefined}
              onAction={() => setJsonCompatible(false)}
            />
            <Action
              title={`JSON Compatible Escape`}
              icon={jsonCompatible ? Icon.Check : undefined}
              onAction={() => setJsonCompatible(true)}
            />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
      markdown={isLoading ? "Loading..." : `\`\`\`text\n${escapedString}\n\`\`\``}
    />
  );
}
