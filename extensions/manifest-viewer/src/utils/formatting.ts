export function getSyntaxLanguage(type: string): string {
  switch (type) {
    case "hls":
      return "m3u8";
    case "dash":
      return "xml";
    case "webvtt":
      return "webvtt";
    default:
      return "text";
  }
}

export function truncateContent(content: string, maxLength: number = 50000): string {
  return content.length > maxLength
    ? content.substring(0, maxLength) + "\n\n... (truncated for display - use Copy Content to get full content)"
    : content;
}

export function createMarkdown(content: string, syntaxLanguage: string): string {
  return `\`\`\`${syntaxLanguage}\n${content}\n\`\`\``;
}
