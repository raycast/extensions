import { Tool, getPreferenceValues } from "@raycast/api";
import fs from "fs";
import { Attachment, Tag } from "resend";
import { getResend, withResend } from "../lib/oauth";
import { parseAttachmentReferences } from "./email-attachments";

// Get preferences
const preferences = getPreferenceValues<{
  sender_name: string;
  sender_email: string;
}>();

// Create default sender string from preferences
const defaultSender = `${preferences.sender_name} <${preferences.sender_email}>`;

type Input = {
  /**
   * The sender of the email.
   * This field will use the default sender from preferences if not provided.
   * Default: "{sender_name} <{sender_email}>" from preferences
   */
  from?: string;
  /**
   * The recipients of the email.
   * Never guess an address. If the user only gives a name, use list-contacts to find the address first.
   */
  to: string[];
  /**
   * The subject of the email.
   * Make sure it's short and concise.
   * Make sure it's based on the content of the email.
   */
  subject: string;
  /**
   * Backwards-compatible HTML content. Prefer html or text for new calls.
   */
  content?: string;
  /** The content of the email as HTML. */
  html?: string;
  /** The plain-text content of the email. */
  text?: string;
  /**
   * The reply-to email address.
   * This is optional.
   */
  replyTo?: string;
  /**
   * The CC recipients of the email.
   * This is optional.
   */
  cc?: string[];
  /**
   * The BCC recipients of the email.
   * This is optional.
   */
  bcc?: string[];
  /**
   * Attachments to include with the email.
   * Two formats are supported:
   * 1. File paths: Absolute paths to files on the local system
   * 2. Hosted files: HTTPS URLs to files hosted online (format: "url:https://example.com/file.pdf")
   * Each line represents one attachment.
   */
  attachments?: string;
  /**
   * Tags for the email for tracking purposes.
   * Format: key:value
   * Each line represents one tag.
   */
  tags?: string;
  /** Custom headers, one `name:value` pair per line. */
  headers?: string;
  /** Subscription topic ID to associate with the email. Use list-topics to discover it. */
  topicId?: string;
  /** A unique key for this send. Reuse the same key when retrying an identical request. */
  idempotencyKey?: string;
  /**
   * When to send the email.
   * ISO 8601 format (e.g., "2023-06-20T12:00:00Z").
   * If not provided, the email will be sent immediately.
   */
  sendAt?: string;
};

const tool = async (input: Input) => {
  const sender = input.from || defaultSender;
  const html = input.html || input.content;
  if (!html && !input.text) {
    throw new Error("Provide html or text content for the email");
  }

  const attachmentReferences = parseAttachmentReferences(input.attachments);
  const attachments: Attachment[] = attachmentReferences.map((attachment) =>
    attachment.kind === "hosted"
      ? { filename: attachment.filename, path: attachment.source }
      : { filename: attachment.filename, content: fs.readFileSync(attachment.source) },
  );

  const tags: Tag[] | undefined = input.tags ? parsePairs(input.tags, "tag") : undefined;
  const headers = parseHeaders(input.headers);
  const scheduledAt = input.sendAt ? parseScheduledAt(input.sendAt) : undefined;

  const resend = getResend();
  const content = html ? { html, ...(input.text ? { text: input.text } : {}) } : { text: input.text as string };
  const { data, error } = await resend.emails.send(
    {
      from: sender,
      to: input.to,
      subject: input.subject,
      ...content,
      ...(input.replyTo && { replyTo: input.replyTo }),
      ...(input.cc?.length && { cc: input.cc }),
      ...(input.bcc?.length && { bcc: input.bcc }),
      ...(attachments.length > 0 && { attachments }),
      ...(tags?.length && { tags }),
      ...(headers && { headers }),
      ...(input.topicId && { topicId: input.topicId }),
      ...(scheduledAt && { scheduledAt }),
    },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
  );

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
};

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  const sender = input.from || defaultSender;
  const content = input.html || input.text || input.content || "";

  const infoItems = [
    { name: "From", value: sender },
    { name: "To", value: input.to.join(", ") },
    { name: "Subject", value: input.subject },
    {
      name: "Content",
      value: content.replace(/<[^>]*>/g, " ").substring(0, 100) + (content.length > 100 ? "..." : ""),
    },
  ];

  if (input.cc && input.cc.length > 0) infoItems.push({ name: "CC", value: input.cc.join(", ") });
  if (input.bcc && input.bcc.length > 0) infoItems.push({ name: "BCC", value: input.bcc.join(", ") });
  if (input.replyTo) infoItems.push({ name: "Reply-To", value: input.replyTo });
  if (input.sendAt)
    infoItems.push({ name: "Scheduled For", value: new Date(parseScheduledAt(input.sendAt)).toLocaleString() });
  if (input.topicId) infoItems.push({ name: "Topic ID", value: input.topicId });

  const headers = parseHeaders(input.headers);
  if (headers) {
    for (const [name, value] of Object.entries(headers)) {
      infoItems.push({ name: `Header: ${name}`, value });
    }
  }

  if (input.attachments) {
    const attachments = parseAttachmentReferences(input.attachments);
    attachments.forEach((attachment, index) => {
      infoItems.push({ name: `Attachment ${index + 1}`, value: attachment.source });
    });
  }

  return {
    title: "Send email",
    message: input.sendAt
      ? `Are you sure you want to schedule this email for ${new Date(input.sendAt).toLocaleString()}?`
      : "Are you sure you want to send this email?",
    info: infoItems,
  };
};

function parseHeaders(value?: string) {
  return value ? Object.fromEntries(parsePairs(value, "header").map(({ name, value }) => [name, value])) : undefined;
}

function parsePairs(value: string, label: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(":");
      const name = line.slice(0, separator).trim();
      const pairValue = line.slice(separator + 1).trim();
      if (separator <= 0 || !name || !pairValue) {
        throw new Error(`Invalid ${label} '${line}'. Use name:value.`);
      }
      return { name, value: pairValue };
    });
}

function parseScheduledAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("The send time must be a valid ISO 8601 datetime");
  }
  return date.toISOString();
}

export default withResend(tool);
