import { gmail_v1 } from "@googleapis/gmail";

/**
 * Extracts and decodes the body content from a Gmail message payload.
 * Prioritizes `text/plain`, falls back to `text/html`.
 */
export async function getBodyFromMessage(
  gmail: gmail_v1.Gmail,
  messageId: string,
  payload?: gmail_v1.Schema$MessagePart,
): Promise<string> {
  if (!payload) return "";

  const plain = await findPartContent(gmail, messageId, payload, "text/plain");
  if (plain) return plain;

  const html = await findPartContent(gmail, messageId, payload, "text/html");
  if (html) return stripHtmlTags(html);

  return "";
}

/**
 * Recursively search parts for a specific MIME type and extract the content
 */
async function findPartContent(
  gmail: gmail_v1.Gmail,
  messageId: string,
  part: gmail_v1.Schema$MessagePart,
  mimeType: string,
): Promise<string | null> {
  if (part.mimeType === mimeType) {
    if (part.body?.data) {
      return decodeBase64(part.body.data);
    }
    // Optional: for future attachmentId support
    // if (part.body?.attachmentId) {
    //   const raw = await getMessageAttachment(gmail, messageId, part.body.attachmentId);
    //   return decodeBase64(raw);
    // }
  }

  if (part.parts && part.parts.length > 0) {
    for (const sub of part.parts) {
      const result = await findPartContent(gmail, messageId, sub, mimeType);
      if (result) return result;
    }
  }

  return null;
}

/**
 * Gmail uses URL-safe Base64 (web-safe encoding)
 */
function decodeBase64(encoded: string): string {
  return Buffer.from(encoded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

/**
 * Fallback: Strip tags from HTML if no plain text found
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
