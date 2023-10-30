import { ActionPanel, Detail, List, Action, showToast, Toast } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";

export default async function Command() {
  const documentsPath = path.join(os.homedir(), "Library/Containers/co.fluder.FSNotes/Data/Documents");

  if (!fs.existsSync(documentsPath)) {
    await showToast({ title: "FSNote's documents Path does not exist", message: "Please install FSNotes firstly!" });
  } else {
    const mdFiles = fs
      .readdirSync(documentsPath)
      .filter((file) => file.endsWith(".md"))
      .map((file) => ({
        name: file,
        modified: fs.statSync(path.join(documentsPath, file)).mtimeMs,
      }))
      .sort((a, b) => b.modified - a.modified)
      .map((file) => file.name);

    return (
      <List>
        {mdFiles.map((file) => (
          <List.Item
            key={file}
            icon="fsnotes-list.png"
            title={file}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  target={<Detail markdown={fs.readFileSync(path.join(documentsPath, file), "utf-8")} />}
                />
                <Action.Open
                  title="Open in FSNotes"
                  target={`fsnotes://find/${encodeURIComponent(file.replace(/\.md$/, ""))}`}
                />
                <Action.OpenWith title="Open With" path={path.join(documentsPath, file)} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }
}
