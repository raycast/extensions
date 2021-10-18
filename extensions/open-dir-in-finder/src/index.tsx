import { ActionPanel, closeMainWindow, Detail, Icon, List, ListItem, OpenInBrowserAction, ShowInFinderAction, Toast, ToastStyle } from "@raycast/api";
import { exec } from "child_process";
import { useState } from "react";
const markdown = `
# Markdown

Simply render markdown, including:
- Headings and blockquotes
- **Bold** and _italics_ emphasis
- Code blocks and \`inline code\`

For more, check out the [CommonMark](https://commonmark.org) spec.
`;

export default function main() {
  const [text, setText] = useState("");
  return <List onSearchTextChange={(t) => { setText(t) }} searchBarPlaceholder="Directory...">
    <List.Item title={`Open in Finder:`} subtitle={text} icon={Icon.Finder} actions={
    <ActionPanel>
      <ActionPanel.Item title="Open in Finder" onAction={() => {exec(`open ${text}`, (err, stdout, stderr) => {
        if (err){
          const toast = new Toast({title: "It seems like that directory doesn't exist...", style: ToastStyle.Failure})
          toast.show();
        }
        else{
          closeMainWindow()
        }
      });
      }}/>
      </ActionPanel>
    }></List.Item>
  </List>
}
