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
  const [state, setState] = useState<{
    file: string;
    saved?: ScanMessages;
    error?: ScanMessages;
  }>();
  useEffect(() => {
    const refresh = () => {
      const next = readScanMessages(file);
      setState((previous) =>
        next.status === "failed"
          ? {
              file,
              saved: previous?.file === file ? previous.saved : undefined,
              error: next,
            }
          : { file, saved: next },
      );
    };
    refresh();
    const timer = setInterval(refresh, 3_000);
    return () => clearInterval(timer);
  }, [file]);
  // A failed poll is not evidence that saved warnings or scan state disappeared.
  // Never carry a snapshot across databases, including before the effect runs.
  const saved = state?.file === file ? state.saved : undefined;
  const error = state?.file === file ? state.error : undefined;
  const messages = [saved, error].flatMap((snapshot) =>
    (snapshot?.messages ?? []).map((item) => ({
      item,
      readFailed: snapshot?.status === "failed",
    })),
  );
  return (
    <List.Section
      title="Scan Messages"
      subtitle={
        error && saved
          ? "Refresh failed · showing last saved results"
          : "Saved per-folder results · updates every 3 seconds"
      }
    >
      {saved?.unfinished && (
        <List.Item
          icon={Icon.Clock}
          title="Scan running or interrupted"
          subtitle={
            error
              ? "Last saved state: no scan end time recorded"
              : "No scan end time recorded yet"
          }
        />
      )}
      {messages.map(({ item, readFailed }) => (
        <List.Item
          key={`${readFailed ? "read" : "saved"}:${item.id}`}
          icon={Icon.Warning}
          title={
            item.root
              ? displayPath(item.root)
              : readFailed
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
      {saved && !error && saved.messages.length === 0 && (
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
