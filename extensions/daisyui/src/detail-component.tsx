import { ActionPanel, Detail, Action, Icon } from "@raycast/api";
import { DaisyUIComponent } from "./utils/components";

interface ComponentDetailProps {
  component: DaisyUIComponent;
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
  \`\`\`javascript
  ${exampleJSX || "No example available"}
  \`\`\`

![${name}](${imageUrl})

  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={componentUrl} icon={Icon.Globe} />
          <Action.CopyToClipboard content={componentUrl} title="Copy URL" icon={Icon.Clipboard} />
          {exampleHTML && (
            <Action.CopyToClipboard
              content={exampleHTML}
              title="Copy Html"
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              icon={Icon.CodeBlock}
            />
          )}
          {exampleJSX && (
            <Action.CopyToClipboard
              content={exampleJSX}
              title="Copy Jsx"
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              icon={Icon.Code}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
