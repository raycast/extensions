import TurndownService from "turndown";
import { showFailureToast } from "@raycast/utils";
import { toError } from "./errorUtils";

const turndownService = new TurndownService();

export default function convertHtmlToMarkdown(htmlContent: string): string {
  if (!htmlContent) {
    return "";
  }

  try {
    return turndownService.turndown(htmlContent);
  } catch (error) {
    showFailureToast(toError(error), { title: "Error converting HTML to Markdown" });
    return htmlContent; // Fallback to original content if conversion fails
  }
}
