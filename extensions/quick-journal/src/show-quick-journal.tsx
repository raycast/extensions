import { List, ActionPanel, Action, getPreferenceValues, Detail } from "@raycast/api";
import fs from "fs";
import path from "path";
import { useState } from "react";

interface Preferences {
  journalFolderPath: string;
}

const preferences = getPreferenceValues<Preferences>();
const homeDirectory = process.env.HOME || "/";
const journalPath = preferences.journalFolderPath || path.join(homeDirectory, "Documents", "Quick Journal");

export default function ListEntries() {
  let entries;

  if (!fs.existsSync(journalPath)) {
    fs.mkdirSync(journalPath, { recursive: true });
  }

  entries = fs.readdirSync(journalPath).filter((file) => file.endsWith(".md"));

  entries = entries
    .map((file) => ({
      name: file,
      path: path.join(journalPath, file),
      birthtime: fs.statSync(path.join(journalPath, file)).birthtime,
    }))
    .sort((a, b) => b.birthtime.getTime() - a.birthtime.getTime())
    .map((file) => file.name);

  const [selectedEntryContent, setSelectedEntryContent] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const readEntryContent = (filePath: string) => {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      setSelectedEntryContent(content);
      setShowDetail(true);
    } catch (error) {
      console.error("Failed to read file:", filePath, error);
    }
  };

  if (showDetail && selectedEntryContent) {
    return <Detail markdown={selectedEntryContent} />;
  }

  return (
    <List isLoading={entries.length === 0} searchBarPlaceholder="Search journal entries...">
      {entries.map((entry, index) => (
        <List.Item
          key={index}
          title={entry}
          actions={
            <ActionPanel>
              <Action title="View Entry" onAction={() => readEntryContent(path.join(journalPath, entry))} />
            </ActionPanel>
          }
          accessories={[{ text: "View Entry" }]}
        />
      ))}
    </List>
  );
}
