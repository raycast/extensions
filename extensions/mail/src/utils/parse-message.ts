import { simpleParser } from "mailparser";
import { stripHtml } from "string-strip-html";

/**
 * Parses an Apple Mail .emlx file by removing the byte count at the beginning
 * and the plist at the end, then extracting the email text content.
 */
export async function parseMessage(message: string) {
  const lines = message.split("\n");
  lines.shift(); // remove the first line containing the byte count
  const emailContent = lines.join("\n");
  const plistStartIndex = emailContent.lastIndexOf("<?xml");
  const emailOnly = plistStartIndex !== -1 ? emailContent.substring(0, plistStartIndex) : emailContent;

  const parsed = await simpleParser(emailOnly);

  return {
    from: parsed.from?.value[0].address || "",
    subject: parsed.subject || "",
    text: parsed.text || (parsed.html ? stripHtml(parsed.html).result.replaceAll("\n", " ") : ""),
  };
}
