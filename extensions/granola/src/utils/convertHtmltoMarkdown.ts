import TurndownService from "turndown";

export default function convertHtmlToMarkdown(htmlContent: string): string {
  if (!htmlContent) {
    return "";
  }

  try {
    const turndownService = new TurndownService();
    return turndownService.turndown(htmlContent);
  } catch (error) {
    console.error("Error converting HTML to Markdown:", error);
    return htmlContent; // Fallback to original content if conversion fails
  }
}
