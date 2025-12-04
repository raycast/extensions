import { Metadata } from "../types";

export function processMarkdownContent(
  content: string,
  title: string,
  links?: { [key: string]: string },
  includeLinksSummary?: boolean,
): {
  markdown: string;
  metadata: Metadata;
} {
  let markdownContent = content;

  if (!markdownContent.startsWith("# ")) {
    markdownContent = `# ${title}\n\n${markdownContent}`;
  }

  if (includeLinksSummary && links && Object.keys(links).length > 0) {
    markdownContent += "\n\n## Links\n\n";
    Object.entries(links)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([text, url]) => {
        markdownContent += `- [${text}](${url})\n`;
      });
  }

  const wordCount = markdownContent.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200) + " min read";

  return {
    markdown: markdownContent,
    metadata: {
      title,
      wordCount,
      readingTime,
    },
  };
}
