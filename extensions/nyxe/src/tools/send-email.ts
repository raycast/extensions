import { Tool } from "@raycast/api";
import { nyxe } from "../lib/raycast";
import { parseRecipients } from "../lib/text";

type Input = {
  /**
   * Recipient email addresses, comma-separated ("ada@example.com, grace@example.com"). At least one.
   */
  to: string;
  /**
   * Addresses to copy in, comma-separated, if the user asked for any.
   */
  cc?: string;
  /**
   * The subject line.
   */
  subject: string;
  /**
   * The message body as plain text.
   */
  text: string;
};

function recipients(raw: string | undefined): string[] {
  const { valid, invalid } = parseRecipients(raw ?? "");
  if (invalid.length > 0) throw new Error(`Not an email address: ${invalid.join(", ")}`);
  return valid;
}

/** Shown to the user before anything is sent. */
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Send this email from your Nyxe address?",
  info: [
    { name: "To", value: recipients(input.to).join(", ") },
    { name: "Cc", value: input.cc ? recipients(input.cc).join(", ") || undefined : undefined },
    { name: "Subject", value: input.subject },
    // The body is what a prompt injection would smuggle out, so the user sees
    // all of it: a cut-off preview would hide whatever follows the cut.
    { name: "Message", value: input.text || "(empty)" },
  ],
});

/**
 * Send a new email from the user's primary Nyxe address. The user confirms
 * the recipients, subject and full message first. To answer an existing thread, use
 * create-reply-draft instead.
 */
export default async function tool(input: Input) {
  const to = recipients(input.to);
  if (to.length === 0) throw new Error("Add at least one recipient");
  const cc = recipients(input.cc);
  const sent = await nyxe().send({
    to,
    ...(cc.length ? { cc } : {}),
    subject: input.subject,
    text: input.text,
  });
  return { sent: true, emailId: sent.emailId, threadId: sent.threadId };
}
