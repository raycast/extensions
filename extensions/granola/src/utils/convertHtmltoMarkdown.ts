import TurndownService from "turndown";

export default function convertHtmlToMarkdown(htmlContent: string): string {
  const turndownService = new TurndownService();
  return turndownService.turndown(htmlContent);
}
