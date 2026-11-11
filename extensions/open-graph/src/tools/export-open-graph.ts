import { exportHtml, exportMarkdown } from "../util";
import getOpenGraph from "./get-open-graph";

type Input = {
  /** Actual page URL explicitly supplied by the user. Never guess or use a placeholder. If missing, ask the user before calling this tool. HTTP and HTTPS are supported; URLs without a scheme use HTTPS. */
  url: string;
  /** Export format. JSON includes metadata, resolved image URLs, preview text, and validation. HTML preserves the declared social tags. */
  format: "json" | "markdown" | "html";
};

/** Return social metadata as export text for a user-supplied URL. Ask for the URL before calling if none was supplied. Does not copy to the clipboard, write files, or modify the page. */
export default async function exportOpenGraph(input: Input) {
  if (!["json", "markdown", "html"].includes(input.format)) {
    throw new Error("Choose json, markdown, or html as the export format.");
  }
  const result = await getOpenGraph({ url: input.url });
  const content =
    input.format === "json"
      ? JSON.stringify(result, null, 2)
      : input.format === "markdown"
        ? exportMarkdown(result.metadata, result.finalUrl)
        : exportHtml(result.metadata);
  return { requestedUrl: result.requestedUrl, finalUrl: result.finalUrl, format: input.format, content };
}
