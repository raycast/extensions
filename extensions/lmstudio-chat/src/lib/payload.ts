import { readFile } from "node:fs/promises";
import { mimeForImage } from "./attachments";
import { Chat, Message } from "./types";

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ApiMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

/** User message text expanded with its frozen text-file attachment blocks. */
export function textWithFileBlocks(message: Message): string {
  const files = (message.attachments ?? []).filter((a) => a.type === "text");
  return files.reduce(
    (text, a) =>
      `${text}\n\n--- attached file: ${a.name} ---\n${a.content ?? ""}`,
    message.content,
  );
}

/**
 * Build the OpenAI-compatible message array for a chat. Images are re-read
 * from disk on every request (base64 is never persisted); missing files are
 * skipped and reported via skippedImages. With includeImages=false (model
 * has no vision) image parts are omitted so the request degrades to text.
 */
export async function buildApiMessages(
  chat: Chat,
  options: { systemPrompt?: string; includeImages: boolean },
): Promise<{ messages: ApiMessage[]; skippedImages: string[] }> {
  const skippedImages: string[] = [];
  const messages: ApiMessage[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  for (const m of chat.messages) {
    const text = m.role === "user" ? textWithFileBlocks(m) : m.content;
    const images =
      options.includeImages && m.role === "user"
        ? (m.attachments ?? []).filter((a) => a.type === "image")
        : [];
    const parts: ContentPart[] = [{ type: "text", text }];
    for (const image of images) {
      try {
        const data = await readFile(image.path);
        parts.push({
          type: "image_url",
          image_url: {
            url: `data:${mimeForImage(image.path)};base64,${data.toString("base64")}`,
          },
        });
      } catch {
        skippedImages.push(image.name);
      }
    }
    messages.push(
      parts.length === 1
        ? { role: m.role, content: text }
        : { role: m.role, content: parts },
    );
  }
  return { messages, skippedImages };
}
