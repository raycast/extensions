import { parse as parseHTML, type HTMLElement } from "node-html-parser";

// ─── Types ───────────────────────────────────────────────────────────

export interface ExtractedContent {
  readonly title: string;
  readonly content: string;
  readonly headings: readonly string[];
}

// ─── Constants ───────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 10000;
const FETCH_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const ELEMENTS_TO_REMOVE = [
  "script",
  "style",
  "nav",
  "footer",
  "header",
  "aside",
  "iframe",
  "noscript",
  "svg",
  ".sidebar",
  ".menu",
  ".ad",
  ".advertisement",
  ".cookie",
  ".popup",
  ".modal",
] as const;

const MAIN_CONTENT_SELECTORS = ["article", "main", "[role=main]"] as const;

// ─── Public API ──────────────────────────────────────────────────────

export function extractContent(
  html: string,
  maxLength: number,
): ExtractedContent {
  const root = parseHTML(html);

  removeUnwantedElements(root);

  const title = extractTitle(root);
  const headings = extractHeadings(root);
  const mainElement = findMainContent(root);
  const rawText = mainElement?.textContent ?? "";
  const content = cleanAndTruncate(rawText, maxLength);

  return { title, content, headings };
}

export async function fetchAndExtract(
  url: string,
  maxLength: number,
): Promise<ExtractedContent | null> {
  try {
    const html = await fetchPage(url);
    return extractContent(html, maxLength);
  } catch {
    return null;
  }
}

// ─── Internals ───────────────────────────────────────────────────────

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": FETCH_USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

function removeUnwantedElements(root: HTMLElement): void {
  for (const selector of ELEMENTS_TO_REMOVE) {
    const elements = root.querySelectorAll(selector);
    for (const el of elements) {
      el.remove();
    }
  }
}

function extractTitle(root: HTMLElement): string {
  const titleTag = root.querySelector("title");
  if (titleTag) {
    const text = titleTag.textContent.trim();
    if (text.length > 0) return text;
  }

  const h1 = root.querySelector("h1");
  if (h1) {
    const text = h1.textContent.trim();
    if (text.length > 0) return text;
  }

  return "Untitled";
}

function extractHeadings(root: HTMLElement): readonly string[] {
  const headingElements = root.querySelectorAll("h1, h2, h3");
  const headings: string[] = [];

  for (const el of headingElements) {
    const text = el.textContent.trim();
    if (text.length > 0) {
      headings.push(text);
    }
  }

  return headings;
}

function findMainContent(root: HTMLElement): HTMLElement | null {
  for (const selector of MAIN_CONTENT_SELECTORS) {
    const element = root.querySelector(selector);
    if (element) return element;
  }

  return root.querySelector("body") ?? root;
}

function cleanAndTruncate(text: string, maxLength: number): string {
  const cleaned = text
    // Collapse all whitespace sequences (spaces, tabs, etc.) into single spaces
    .replace(/[^\S\n]+/g, " ")
    // Collapse multiple consecutive newlines into double newlines
    .replace(/\n{3,}/g, "\n\n")
    // Remove lines that are only whitespace
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Truncate at a word boundary when possible
  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const cutPoint = lastSpace > maxLength * 0.8 ? lastSpace : maxLength;

  return truncated.slice(0, cutPoint) + "…";
}
