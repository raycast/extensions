export interface Entry {
  id: string;
  kind: string;
  timestampMs?: number;
  [key: string]: unknown;
}

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function entryText(entry: Entry): string {
  if (entry.kind === "user-attachment" && typeof entry.file_name === "string")
    return `Attached file: ${entry.file_name}\n\nUse Download File to save a copy.`;
  if (typeof entry.content === "string") return entry.content;
  if (record(entry.message)) {
    if (
      entry.message.type === "attachment" &&
      typeof entry.message.file_name === "string"
    )
      return `File: ${entry.message.file_name}\n\nUse Download File when available, or open the Grok Bot app to view it.`;
    if (typeof entry.message.content === "string") return entry.message.content;
    if (
      entry.message.type === "widget" &&
      record(entry.message.widget) &&
      typeof entry.message.widget.prompt === "string"
    )
      return (
        entry.message.widget.prompt +
        (typeof entry.respondedValue === "string"
          ? `\n\nYour response: ${entry.respondedValue}`
          : "\n\nUse Answer Question to respond.")
      );
    if (
      entry.message.type === "auto-review-approval" &&
      record(entry.message.approval) &&
      typeof entry.message.approval.summary === "string"
    )
      return `Approval request: ${entry.message.approval.summary}\n\nStatus: ${entry.message.approval.status}`;
    if (typeof entry.message.type === "string")
      return `Bot shared ${entry.message.type}. Open the Grok Bot app to view this content.`;
  }
  if (typeof entry.text === "string") return entry.text;
  return `Activity: ${entry.kind}`;
}

export function entryAuthor(entry: Entry, botName: string): string {
  if (record(entry.fromAgent) && typeof entry.fromAgent.name === "string")
    return entry.fromAgent.name;
  return entry.role === "user" || entry.kind === "user-attachment"
    ? "You"
    : botName;
}
