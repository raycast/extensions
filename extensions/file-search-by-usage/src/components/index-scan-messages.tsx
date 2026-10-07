import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import {
  readScanMessages,
  ScanMessages,
  scanMessageMarkdown,
  scanMessageText,
} from "../lib/scan-messages";
import { displayPath } from "../lib/read-dir";

/** Poll metadata, not entry counts or the filesystem, while settings is open. */
export function IndexScanMessages({ file }: { file: string }) {
  const [saved, setSaved] = useState<ScanMessages>();
  useEffect(() => {
    const refresh = () => setSaved(readScanMessages(file));
    refresh();
    const timer = setInterval(refresh, 3_000);
    return () => clearInterval(timer);
  }, [file]);
  return (
    <List.Section
      title="Scan Messages"
      subtitle="Saved per-folder results · updates every 3 seconds"
    >
      {saved?.unfinished && (
        <List.Item
          icon={Icon.Clock}
          title="Scan running or interrupted"
          subtitle="No scan end time recorded yet"
        />
      )}
      {saved?.messages.map((item) => (
        <List.Item
          key={item.id}
          icon={Icon.Warning}
          title={
            item.root
              ? displayPath(item.root)
              : saved.status === "failed"
                ? "Scan messages could not be read"
                : "Rebuild error"
          }
          subtitle={item.message}
          accessories={
            item.recordedAt
              ? [
                  {
                    date: new Date(item.recordedAt),
                    tooltip: new Date(item.recordedAt).toLocaleString(),
                  },
                ]
              : []
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="View Full Message"
                icon={Icon.Document}
                target={
                  <Detail
                    markdown={scanMessageMarkdown(item)}
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard
                          title="Copy Scan Message"
                          content={scanMessageText(item)}
                        />
                      </ActionPanel>
                    }
                  />
                }
              />
              <Action.CopyToClipboard
                title="Copy Scan Message"
                content={scanMessageText(item)}
              />
            </ActionPanel>
          }
        />
      ))}
      {saved && saved.messages.length === 0 && (
        <List.Item
          icon={Icon.Info}
          title={
            saved.status === "missing"
              ? "No saved scan messages yet"
              : saved.unfinished
                ? "No warnings recorded so far"
                : "No saved scan warnings"
          }
          subtitle="Folder warnings are recorded when each folder finishes scanning"
        />
      )}
    </List.Section>
  );
}
