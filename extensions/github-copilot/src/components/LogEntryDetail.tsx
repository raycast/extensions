import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import type { LogEntry } from "../services/events";

function formatToolCallMarkdown(entry: LogEntry): string {
  const parts: string[] = [];

  parts.push(`# ${entry.toolName ?? "Tool Call"}`);
  parts.push("");

  if (entry.arguments && Object.keys(entry.arguments).length > 0) {
    parts.push("## Input");
    parts.push("");
    parts.push("```json");
    parts.push(JSON.stringify(entry.arguments, null, 2));
    parts.push("```");
    parts.push("");
  }

  if (entry.result) {
    parts.push("## Output");
    parts.push("");
    let resultText: string;
    if (typeof entry.result === "string") {
      resultText = entry.result;
    } else {
      resultText = JSON.stringify(entry.result, null, 2);
    }
    // Truncate very long output
    if (resultText.length > 10000) {
      resultText = resultText.slice(0, 10000) + "\n\n…(truncated)";
    }
    parts.push("```");
    parts.push(resultText);
    parts.push("```");
  }

  return parts.join("\n");
}

function formatMessageMarkdown(entry: LogEntry): string {
  const parts: string[] = [];

  const typeLabel =
    entry.type === "user_message" ? "User Message" : entry.type === "assistant_message" ? "Assistant" : entry.type;

  parts.push(`# ${typeLabel}`);
  parts.push("");
  parts.push(entry.content ?? "");

  return parts.join("\n");
}

function formatInfoMarkdown(entry: LogEntry): string {
  const icon = entry.type === "error" ? "❌" : "ℹ️";
  return `# ${icon} ${entry.type === "error" ? "Error" : "Info"}\n\n${entry.content ?? ""}`;
}

export function LogEntryDetail({ entry }: { entry: LogEntry }) {
  let markdown: string;

  if (entry.type === "tool_call") {
    markdown = formatToolCallMarkdown(entry);
  } else if (entry.type === "user_message" || entry.type === "assistant_message") {
    markdown = formatMessageMarkdown(entry);
  } else {
    markdown = formatInfoMarkdown(entry);
  }

  const title =
    entry.type === "tool_call"
      ? (entry.toolName ?? "Tool Call")
      : entry.type === "user_message"
        ? "User Message"
        : entry.type === "assistant_message"
          ? "Assistant"
          : entry.type === "error"
            ? "Error"
            : "Info";

  return (
    <Detail
      navigationTitle={title}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Content"
            content={
              entry.type === "tool_call"
                ? typeof entry.result === "string"
                  ? entry.result
                  : JSON.stringify(entry.result ?? entry.arguments, null, 2)
                : (entry.content ?? "")
            }
            icon={Icon.Clipboard}
          />
        </ActionPanel>
      }
    />
  );
}
