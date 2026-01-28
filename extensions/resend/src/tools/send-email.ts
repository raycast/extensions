import { Tool, getPreferenceValues } from "@raycast/api";
import fs from "fs";
import path from "path";
import { resend } from "../lib/resend";

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
   * If the user has only provided recipients by name, you must search for contacts using the `search-contacts` tool.
   */
  to: string[];
  /**
   * The subject of the email.
   * Make sure it's short and concise.
   * Make sure it's based on the content of the email.
   */
  subject: string;
  /**
   * The content of the email as HTML.
   * Don't include any introduction or salutation. Just the main content.
   */
  content: string;
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
   * 2. Hosted files: URLs to files hosted online (format: "url:https://example.com/file.pdf")
   * Each line represents one attachment.
   */
  attachments?: string;
  /**
   * Tags for the email for tracking purposes.
   * Format: key:value
   * Each line represents one tag.
   */
  tags?: string;
  /**
   * When to send the email.
   * ISO 8601 format (e.g., "2023-06-20T12:00:00Z").
   * If not provided, the email will be sent immediately.
   */
  sendAt?: string;
};

const tool = async (input: Input) => {
  // Use default sender from preferences if input.from is not provided
  const sender = input.from || defaultSender;

  // Parse attachments if provided
  const attachments = [];
  if (input.attachments) {
    const attachmentLines = input.attachments.split("\n");

    for (const line of attachmentLines) {
      // Check if it's a hosted attachment (URL)
      if (line.startsWith("url:")) {
        const url = line.substring(4).trim();
        const filename = path.basename(url);
        attachments.push({ filename, path: url });
      }
      // Otherwise treat as a file path
      else {
        const filePath = line.trim();
        if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
          const content = fs.readFileSync(filePath).toString("base64");
          const filename = path.basename(filePath);
          attachments.push({ filename, content });
        } else {
          throw new Error(`Attachment file not found: ${filePath}`);
        }
      }
    }
  }

  // Parse tags if provided
  const tags = input.tags
    ? input.tags.split("\n").map((line) => {
        const [name, value] = line.split(":");
        return { name, value };
      })
    : undefined;

  const { data, error } = await resend.emails.send({
    from: sender,
    to: input.to,
    subject: input.subject,
    html: input.content,
    ...(input.replyTo && { reply_to: input.replyTo }),
    ...(input.cc && { cc: input.cc }),
    ...(input.bcc && { bcc: input.bcc }),
    ...(attachments.length > 0 && { attachments }),
    ...(tags && { tags }),
    ...(input.sendAt && { send_at: new Date(input.sendAt).toISOString() }),
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
};

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  // Use default sender from preferences if input.from is not provided
  const sender = input.from || defaultSender;

  // Create info items for the confirmation dialog
  const infoItems = [
    { name: "From", value: sender },
    { name: "To", value: input.to.join(", ") },
    { name: "Subject", value: input.subject },
    {
      name: "Content",
      value: input.content.replace(/<[^>]*>/g, " ").substring(0, 100) + (input.content.length > 100 ? "..." : ""),
    },
  ];

  // Add optional fields to the info items if they are provided
  if (input.cc && input.cc.length > 0) infoItems.push({ name: "CC", value: input.cc.join(", ") });
  if (input.bcc && input.bcc.length > 0) infoItems.push({ name: "BCC", value: input.bcc.join(", ") });
  if (input.replyTo) infoItems.push({ name: "Reply-To", value: input.replyTo });
  if (input.sendAt) infoItems.push({ name: "Scheduled For", value: new Date(input.sendAt).toLocaleString() });

  // Add attachment count if attachments are provided
  if (input.attachments) {
    const attachmentCount = input.attachments.split("\n").length;
    infoItems.push({ name: "Attachments", value: `${attachmentCount} file(s)` });
  }

  return {
    title: "Send email",
    message: input.sendAt
      ? `Are you sure you want to schedule this email for ${new Date(input.sendAt).toLocaleString()}?`
      : "Are you sure you want to send this email?",
    info: infoItems,
  };
};

export default tool;
