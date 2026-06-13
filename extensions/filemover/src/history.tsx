import { Action, ActionPanel, Icon, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { performUndo, UndoHistory } from "./undo-utils";
import * as path from "path";

export default function HistoryCommand() {
  const [history, setHistory] = useState<UndoHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadHistory() {
    setIsLoading(true);
    const historyStr = await LocalStorage.getItem<string>("actionHistory");
    if (historyStr) {
      try {
        setHistory(JSON.parse(historyStr));
      } catch {
        // ignore
      }
    } else {
      // Check legacy history
      const legacy = await LocalStorage.getItem<string>("lastAction");
      if (legacy) {
        try {
          const l = JSON.parse(legacy);
          setHistory([{ ...l, id: "legacy", destFolder: "Unknown" }]);
        } catch {
          // ignore
        }
      }
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleUndo(id: string) {
    const success = await performUndo(id);
    if (success) {
      // Reload history to reflect the removed item
      await loadHistory();
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search past actions..." isShowingDetail>
      {history.length === 0 ? (
        <List.EmptyView
          title="No History"
          description="Your recent file operations will appear here."
          icon={Icon.Clock}
        />
      ) : (
        history.map((item) => {
          const date = new Date(item.timestamp);
          const timeString = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const dateString = date.toLocaleDateString();
          const fileCount = item.files.length;

          const fileWord = fileCount === 1 ? "file" : "files";
          let title = `Moved ${fileCount} ${fileWord} to ${path.basename(item.destFolder)}`;
          if (item.type === "copy") title = `Copied ${fileCount} ${fileWord} to ${path.basename(item.destFolder)}`;
          if (item.type === "rename")
            title = `Renamed & Moved ${fileCount} ${fileWord} to ${path.basename(item.destFolder)}`;

          return (
            <List.Item
              key={item.id}
              title={title}
              subtitle={`${dateString} at ${timeString}`}
              icon={item.type === "copy" ? Icon.CopyClipboard : Icon.ArrowRight}
              accessories={[{ text: `${fileCount} file${fileCount === 1 ? "" : "s"}` }]}
              detail={
                <List.Item.Detail
                  markdown={`### Files\n\n${item.files.map((f) => `- **${path.basename(f.newPath)}**\n  \n  From: \`${path.dirname(f.originalPath)}\``).join("\n\n")}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Destination" text={item.destFolder} />
                      <List.Item.Detail.Metadata.Label title="Operation Type" text={item.type.toUpperCase()} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action title="Undo This Action" icon={Icon.Undo} onAction={() => handleUndo(item.id)} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
