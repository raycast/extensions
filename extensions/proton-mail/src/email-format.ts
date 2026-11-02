import { escapeMarkdown } from "./email-markdown";
import { Email, EmailAddress } from "./types";

// Flags cached by older versions were Sets, which JSON turned into {}
export function isRead(email: Email): boolean {
  return Array.isArray(email.flags) && email.flags.includes("\\Seen");
}

export function withRead(email: Email, read: boolean): Email {
  const flags = Array.isArray(email.flags) ? email.flags.filter((flag) => flag !== "\\Seen") : [];
  return { ...email, flags: read ? [...flags, "\\Seen"] : flags };
}

// "Name <address>, …" for the preview metadata and the copy actions
export function formatAddresses(addresses: EmailAddress[]): string {
  return addresses.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");
}

// Subject, sender, recipients and date as Markdown above the body
export function emailHeaderMarkdown(email: Email): string {
  const sender = email.from[0];
  const from = sender
    ? `**${escapeMarkdown(sender.name || sender.address)}**${sender.name ? ` · ${escapeMarkdown(sender.address)}` : ""}`
    : "";
  const list = (addresses: EmailAddress[]) => {
    const shown = addresses.slice(0, 3).map((address) => escapeMarkdown(address.name || address.address));
    const more = addresses.length - shown.length;
    return more > 0 ? `${shown.join(", ")} and ${more} more` : shown.join(", ");
  };
  const recipients = [
    email.to.length ? `To ${list(email.to)}` : "",
    email.cc?.length ? `Cc ${list(email.cc)}` : "",
  ].filter(Boolean);
  const details = [
    new Date(email.date).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" }),
    isRead(email) ? "" : "Unread",
    email.hasAttachment ? "Attachment" : "",
  ].filter(Boolean);
  // Two trailing spaces end each line with a line break
  return [
    `## ${escapeMarkdown(email.subject)}`,
    "",
    [from, recipients.join(" · "), details.join(" · ")].filter(Boolean).join("  \n"),
  ].join("\n");
}

// The whole email as Markdown, for "Copy Email as Markdown"
export function emailAsMarkdown(email: Email, bodyMarkdown: string): string {
  const cc = email.cc?.length ? `\n**CC:** ${formatAddresses(email.cc)}` : "";
  return `# ${email.subject}\n\n**From:** ${formatAddresses(email.from)}\n**To:** ${formatAddresses(email.to)}${cc}\n**Date:** ${new Date(email.date).toLocaleString()}\n\n---\n\n${bodyMarkdown}`;
}
