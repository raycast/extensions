import TurndownService from "turndown";
import { showFailureToast } from "@raycast/utils";

const turndownService = new TurndownService();

export default function convertHtmlToMarkdown(htmlContent: string): string {
  if (!htmlContent) {
    return "";
  }

  try {
    return turndownService.turndown(htmlContent);
  } catch (error) {
    showFailureToast({ title: "Error converting HTML to Markdown", message: String(error) });
    return htmlContent; // Fallback to original content if conversion fails
  }
}
