import { ActionPanel, closeMainWindow, Icon, List, Toast, ToastStyle } from "@raycast/api";
import { exec } from "child_process";
import { useState } from "react";


export default function main() {
  const [text, setText] = useState("");
  return <List onSearchTextChange={(t) => { setText(t) }} searchBarPlaceholder="Directory...">
    <List.Item title={`Open in Finder:`} subtitle={text} icon={Icon.Finder} actions={
      <ActionPanel>
        <ActionPanel.Item title="Open in Finder" onAction={() => {
          exec(`open ${text}`, (err, stdout, stderr) => {
            if (err) {
              const toast = new Toast({ title: "It seems like that directory doesn't exist...", style: ToastStyle.Failure })
              toast.show();
            }
            else {
              closeMainWindow()
            }
          });
        }} />
      </ActionPanel>
    }></List.Item>
  </List>
}
