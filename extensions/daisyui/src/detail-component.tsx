import { ActionPanel, Detail, Action, Icon } from "@raycast/api";
import { daisyUIComponent } from "./utils/components";

interface ComponentDetailProps {
  component: daisyUIComponent;
}

export default function ComponentDetail({ component }: ComponentDetailProps) {
  const { name, description, imageUrl, componentUrl, exampleHTML, exampleJSX } = component;

  const markdown = `
  ## ${name}
  ${description}

  #### HTML (⌘+C to copy to clipboard)
  \`\`\`html
  ${exampleHTML || "No example available"}
  \`\`\`

  #### JSX (⌘+⇧+C to copy to clipboard)
  \`\`\`jsx
  ${exampleJSX || "No example available"}
  \`\`\`

![${name}](${imageUrl})

  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Browser">
            <Action.OpenInBrowser url={componentUrl} icon={Icon.Globe} />
            <Action.CopyToClipboard content={componentUrl} title="Copy URL" icon={Icon.Clipboard} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Code Examples">
            {exampleHTML && (
              <Action.CopyToClipboard
                content={exampleHTML}
                // eslint-disable-next-line @raycast/prefer-title-case
                title="Copy HTML"
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                icon={Icon.CodeBlock}
              />
            )}
            {exampleJSX && (
              <Action.CopyToClipboard
                content={exampleJSX}
                // eslint-disable-next-line @raycast/prefer-title-case
                title="Copy JSX"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                icon={Icon.Code}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
