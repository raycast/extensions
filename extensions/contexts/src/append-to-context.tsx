import { List, showToast, Toast, ActionPanel, Action } from "@raycast/api";
import React from "react";
import fs from "fs";
import path from "path";
import os from "os";

interface Arguments {
  text: string;
}

export default function Command(props: { arguments: Arguments }) {
  const contextsDir = path.join(os.homedir(), "Library/Application Support/ContextManager");
  let files: string[] = [];

  try {
    files = fs.readdirSync(contextsDir).filter((file) => file.endsWith(".txt"));
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to read contexts",
      message: String(error),
    });
  }

  const appendTextToFile = (fileName: string) => {
    const filePath = path.join(contextsDir, fileName);
    try {
      fs.appendFileSync(filePath, props.arguments.text + "\n", "utf-8");
      showToast({
        style: Toast.Style.Success,
        title: "Text appended",
        message: `Appended to ${fileName}`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to append text",
        message: String(error),
      });
    }
  };

  return (
    <List>
      {files.map((file) => (
        <List.Item
          key={file}
          title={file}
          actions={
            <ActionPanel>
              <Action title="Append Text" onAction={() => appendTextToFile(file)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
