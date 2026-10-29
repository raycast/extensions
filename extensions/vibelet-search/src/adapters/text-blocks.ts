/** Extract visible text from a Claude/Codex message `content` field. */
export function extractTextBlocks(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((block: { type?: string; text?: string }) => {
      // Skip non-text blocks (tool calls, images, etc.)
      if (block.type === "tool_use" || block.type === "tool_result" || block.type === "input_image") {
        return "";
      }
      return block.text || "";
    })
    .filter(Boolean)
    .join("\n");
}
