import { List, ActionPanel, Action, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";
import { exec } from "child_process";
import { useEffect, useState } from "react";

const purgatoryPath = path.join(os.homedir(), "purgatory.md");

type Entry = {
  timestamp: string;
  text: string;
  raw: string;
};

export default function Command() {
  const [entries, setEntries] = useState<Entry[]>([]);

  function parseEntries(fileContent: string): Entry[] {
    return fileContent
      .split("### ")
      .filter((e) => e.trim() !== "")
      .map((e) => {
        const lines = e.trim().split("\n");
        const timestamp = lines[0]?.trim();
        const fullEntry = "### " + e.trim();
        const mainLine =
          lines
            .find((line) => /^- /.test(line))
            ?.slice(2)
            .trim() || "(No main entry)";
        return {
          timestamp,
          text: mainLine,
          raw: fullEntry,
        };
      })
      .reverse();
  }

  const refresh = () => {
    if (!fs.existsSync(purgatoryPath)) return;
    const content = fs.readFileSync(purgatoryPath, "utf8");
    setEntries(parseEntries(content));
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleDelete = async (entryToDelete: string) => {
    const confirmed = await confirmAlert({
      title: "Delete Entry?",
      message: "This will permanently remove the entry from purgatory.md",
      icon: Icon.Trash,
    });

    if (!confirmed) return;

    const fileContent = fs.readFileSync(purgatoryPath, "utf8");
    const newContent = fileContent.replace(entryToDelete + "\n\n", "");
    fs.writeFileSync(purgatoryPath, newContent);
    await showToast({ style: Toast.Style.Success, title: "Entry deleted" });
    refresh();
  };

  return (
    <List searchBarPlaceholder="Search Purgatory...">
      {entries.map((entry, index) => (
        <List.Item
          key={index}
          title={entry.text}
          subtitle={entry.timestamp}
          actions={
            <ActionPanel>
              <Action
                title="Open in Xcode"
                onAction={() => {
                  exec(`open "${purgatoryPath}"`);
                }}
              />
              <Action
                title="Delete Entry"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(entry.raw)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
