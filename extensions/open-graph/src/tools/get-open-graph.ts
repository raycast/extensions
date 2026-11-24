import { fetchPage } from "../fetch-page";
import { normalizeUrl, parseOpenGraph, previewText, validateOpenGraph } from "../util";

type Input = {
  /** Actual page URL explicitly supplied by the user. Never guess or use a placeholder. If missing, ask the user before calling this tool. HTTP and HTTPS are supported; URLs without a scheme use HTTPS. */
  url: string;
};

/** Inspect a user-supplied URL's social metadata and check required OG properties. Ask for the URL before calling if none was supplied. Image sizes are declared values, not measured dimensions. */
export default async function getOpenGraph(input: Input) {
  const requestedUrl = normalizeUrl(input.url);
  const { html, finalUrl } = await fetchPage(requestedUrl);
  const metadata = parseOpenGraph(html, finalUrl);
  const issues = validateOpenGraph(metadata);
  return {
    requestedUrl,
    finalUrl,
    metadata,
    preview: previewText(metadata),
    validation: { valid: issues.length === 0, issues },
  };
}
