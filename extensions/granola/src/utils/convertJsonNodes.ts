import { ContentNode, Attachment, DocumentStructure } from "./types";

export function convertNodeToMarkdown(node: ContentNode): string {
  if (!node) return "";

  const newLine = `\n\n`;

  switch (node.type) {
    case "paragraph":
      return node.content?.map(convertNodeToMarkdown).join(" ") + newLine;
    case "heading":
      return `${"#".repeat(node.attrs?.level || 1)} ${node.content?.map(convertNodeToMarkdown).join(" ")} ${newLine}`;
    case "bulletList":
      return node.content?.map(convertNodeToMarkdown).join("") + newLine;
    case "listItem":
      return `- ${node.content?.map(convertNodeToMarkdown).join(" ")} ${newLine}`;
    case "text":
      return node.text || "";
    case "horizontalRule":
      return "--- " + newLine;
    case "doc":
      return node.content ? node.content.map(convertNodeToMarkdown).join("") : "";
    default:
      return "";
  }
}

export function convertDocumentToMarkdown(content: DocumentStructure | null | undefined): string {
  if (!content) return "";

  // Handle the new document structure
  if (content.type === "doc") {
    return convertNodeToMarkdown(content as unknown as ContentNode);
  }

  // Fallback for the old structure with attachments
  if (Array.isArray(content.attachments)) {
    return content.attachments
      .map((attachment: Attachment) => {
        const parsedContent: ContentNode = JSON.parse(attachment.content);
        return convertNodeToMarkdown(parsedContent);
      })
      .join(" \n\n ");
  }

  return "";
}
