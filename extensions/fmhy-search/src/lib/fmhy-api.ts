import { parseFmhyMarkdown } from "./parser";
import type { FmhyIndex } from "./types";

export const FMHY_SINGLE_PAGE_URL = "https://api.fmhy.net/single-page";

export async function fetchFmhySinglePage(): Promise<string> {
  const response = await fetch(FMHY_SINGLE_PAGE_URL, {
    headers: {
      Accept: "text/markdown,text/plain,*/*",
      "User-Agent": "FMHY Search Raycast Extension",
    },
  });

  if (!response.ok) {
    throw new Error(`FMHY API returned ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  if (!text.trim()) {
    throw new Error("FMHY API returned an empty response");
  }

  return text;
}

export async function fetchFmhyIndex(): Promise<FmhyIndex> {
  const markdown = await fetchFmhySinglePage();
  const index = parseFmhyMarkdown(markdown);

  if (index.results.length === 0) {
    throw new Error("FMHY response did not contain any valid resources");
  }

  return index;
}
