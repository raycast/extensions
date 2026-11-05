// A thread as markdown, laid out like Spark's conversation view: the subject,
// then each message as an avatar, "Name to Recipients · date", and the body.
//
// No Raycast imports here: this file runs under `node --test` as-is.

import { heading, inline, untrusted } from "./markdown.ts";
import type { Address, ThreadMessage, ThreadResult } from "./types.ts";
import { displayName, formatBytes, toDate } from "./types.ts";

/// A message header drawn as an image - avatar, name, and `detail` - or
/// undefined to fall back to a text header.
export type HeaderImage = (
  message: ThreadMessage,
  name: string,
  detail: string,
) => { url: string; width: number; height: number } | undefined;

/// "24 Sep, 4:42 PM", with the year when it isn't this year's.
export function messageDate(value: string | undefined, now = new Date()): string {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/// "Alex Rivera", "Alex Rivera and Bob", or "Alex Rivera and 3 others".
export function recipientNames(addresses: Address[]): string {
  const names = addresses.map(displayName).filter(Boolean);
  if (names.length <= 2) return names.join(" and ");
  return `${names[0]} and ${names.length - 1} others`;
}

function messageMarkdown(message: ThreadMessage, headerImage: HeaderImage, now: Date): string {
  const comment = message.type === "Chat Message";
  const name = `${comment ? "💬 " : ""}${message.from.map(displayName).join(", ") || "(unknown sender)"}`;
  const to = !comment && message.to.length ? `to ${recipientNames(message.to)}` : "";
  const detail = [to, messageDate(message.date, now)].filter(Boolean).join(" · ");
  const image = headerImage(message, name, detail);
  // An image alone on its line is centered; the non-breaking space after it
  // keeps the line inline text, so the header stays on the left.
  const header = image
    ? `![](${image.url}?raycast-width=${image.width}&raycast-height=${image.height})&nbsp;`
    : `**${inline(name)}** ${inline(detail)}`;

  const parts = [header, untrusted(message.body.trim()) || "_(no text)_"];
  if (message.attachments.length) {
    parts.push(message.attachments.map((a) => `📎 ${inline(a.name)} · ${formatBytes(a.size)}`).join("  \n"));
  }
  return parts.join("\n\n");
}

export function threadMarkdown(thread: ThreadResult, headerImage: HeaderImage, now = new Date()): string {
  const head = [`# ${heading(thread.subject || "(no subject)")}`];
  const details: string[] = [];
  const labels = thread.labels.map((label) => label.split(":").pop() || label);
  if (labels.length) details.push(`🏷 ${inline(labels.join(", "))}`);
  if (thread.assigned_to.length) details.push(`Assigned to ${inline(thread.assigned_to.map(displayName).join(", "))}`);
  if (thread.shared_with.length) details.push(`Shared with ${inline(thread.shared_with.map(displayName).join(", "))}`);
  if (details.length) head.push(details.join(" · "));
  return [head.join("\n\n"), ...thread.messages.map((m) => messageMarkdown(m, headerImage, now))].join("\n\n---\n\n");
}
