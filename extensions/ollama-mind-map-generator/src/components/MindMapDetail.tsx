import { Detail, ActionPanel, Action, popToRoot, Icon } from "@raycast/api";
import { GeneratedMindMap } from "../utils/types";

export function MindMapDetail({ path }: GeneratedMindMap) {
  const fileUrl = `file://${path.startsWith("/") ? "" : "/"}${path}`;

  return (
    <Detail
      markdown={`# 🎯 Mind Map Generated Successfully!

## 📍 File Location
\`\`\`
${path}
\`\`\`
🌐 Open in Browser to view the interactive mind map (⏎)

## 📋 Generated Content
The mind map has been generated and stored at the location above. Also, the markdown content has been copied to your clipboard.
- Paste it directly into any markdown editor
- Use it with other mind map tools like [https://markmap.js.org/](https://markmap.js.org/)
`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={fileUrl} title="Open in Browser" icon={Icon.Globe} />
          <Action.ShowInFinder path={path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
          <Action.CopyToClipboard content={path} title="Copy Path" icon={Icon.Clipboard} />
          <Action
            title="Back to Model Selection"
            icon={Icon.ChevronLeft}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={() => popToRoot()}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Open Mind Map" target={fileUrl} text="Open in Browser" />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text="Generated" color={"green"} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Location" text={path} />
        </Detail.Metadata>
      }
    />
  );
}
