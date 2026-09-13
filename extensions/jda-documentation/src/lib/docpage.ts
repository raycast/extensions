import { parse } from "node-html-parser";
import TurndownService from "turndown";
import { DOCS_BASE, WIKI_BASE } from "./constants";
import { faqHtml } from "./faq";
import { detailsCache, fetchPage } from "./pages";
import { DocEntry } from "./types";
import { guideHtml } from "./wiki";

export interface DocDetails {
  signature: string | null;
  markdown: string;
  example: string | null;
  references: string[];
}

const MAX_BLOCK = 300000;
const PREFETCH_CONCURRENCY = 6;

// A stray percent sign in a generated anchor makes decodeURIComponent throw,
// which would reject loadDetails and leave the entry unopenable.
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function balancedEnd(html: string, start: number, tag: string): number {
  const open = new RegExp(`<${tag}[\\s>]`, "g");
  const close = new RegExp(`</${tag}>`, "g");
  const limit = Math.min(html.length, start + MAX_BLOCK);
  open.lastIndex = start + 1;
  close.lastIndex = start + 1;

  let depth = 1;
  while (depth > 0) {
    const closing = close.exec(html);
    if (!closing || closing.index > limit) return limit;

    let opening = open.exec(html);
    while (opening && opening.index < closing.index) {
      depth++;
      opening = open.exec(html);
    }
    if (opening) open.lastIndex = opening.index;

    depth--;
    close.lastIndex = closing.index + closing[0].length;
    if (depth === 0) return close.lastIndex;
  }
  return limit;
}

// Javadoc puts every documented element inside its own <section>, so the block
// is found by walking back from the id to that section rather than by parsing
// the page. A full DOM of Guild.html costs about twenty times the heap of one
// sliced section.
export function sliceAround(html: string, anchor: string): string | null {
  const pattern = new RegExp(`\\sid="${escapeRegExp(escapeHtml(anchor))}"`);
  const match = pattern.exec(html);
  if (!match) return null;

  const index = match.index + 1;
  const section = html.lastIndexOf("<section", index);
  if (section === -1) return null;

  const end = balancedEnd(html, section, "section");
  return index < end ? html.slice(section, end) : null;
}

function prepare(html: string, base: string): string {
  return html
    .replace(/<a class="(?:headerlink|anchor-link)"[\s\S]*?<\/a>/g, "")
    .replace(
      /(href|src)="(?!https?:|mailto:|data:)([^"]+)"/g,
      (_, attribute, target) => `${attribute}="${new URL(target, base).href}"`,
    );
}

interface RuleNode {
  nodeName: string;
  textContent: string | null;
  innerHTML: string;
  childNodes: ArrayLike<RuleNode>;
  classList: { contains(token: string): boolean };
}

function asRuleNode(node: unknown): RuleNode {
  return node as RuleNode;
}

function createTurndown(): TurndownService {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
  });

  service.addRule("codeBlock", {
    filter: (node) => asRuleNode(node).nodeName === "PRE",
    replacement: (_content, node) =>
      `\n\n\`\`\`java\n${(asRuleNode(node).textContent ?? "").trim()}\n\`\`\`\n\n`,
  });

  service.addRule("deprecation", {
    filter: (node) =>
      asRuleNode(node).nodeName === "DIV" &&
      asRuleNode(node).classList.contains("deprecation-block"),
    replacement: (content) =>
      `\n\n${content
        .trim()
        .split("\n")
        .map((line) => `> ${line}`.trimEnd())
        .join("\n")}\n\n`,
  });

  service.addRule("notes", {
    filter: (node) =>
      asRuleNode(node).nodeName === "DL" &&
      (asRuleNode(node).classList.contains("notes") ||
        asRuleNode(node).classList.contains("tag-list-long")),
    replacement: (_content, node) => {
      const parts: string[] = [];
      let title = "";
      for (const child of Array.from(asRuleNode(node).childNodes)) {
        if (child.nodeName === "DT")
          title = (child.textContent ?? "").trim().replace(/:$/, "");
        if (child.nodeName === "DD") {
          const rendered = service.turndown(child.innerHTML).trim();
          if (rendered) parts.push(`**${title}**\n\n${rendered}`);
        }
      }
      return parts.length ? `\n\n${parts.join("\n\n")}\n\n` : "";
    },
  });

  return service;
}

const turndown = createTurndown();

function cleanSignature(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

const SIGNATURE_CLASSES = [
  "member-signature",
  "type-signature",
  "package-signature",
];

function splitBlock(slice: string): { signature: string | null; html: string } {
  const root = parse(slice);
  const heading = root.querySelector("h1, h2, h3");
  heading?.remove();

  let signature: string | null = null;
  for (const className of SIGNATURE_CLASSES) {
    const node = root.querySelector(`.${className}`);
    if (!node) continue;
    signature = cleanSignature(node.text);
    node.remove();
    break;
  }

  return { signature, html: root.innerHTML };
}

function collectReferences(markdown: string): string[] {
  const found = new Set<string>();
  // Turndown backslash-escapes the parentheses of a Java signature inside the
  // link target, so the URL has to be read back through that escaping.
  const pattern = new RegExp(
    `\\]\\(${escapeRegExp(DOCS_BASE)}((?:\\\\.|[^)\\s])+)\\)`,
    "g",
  );

  for (const match of markdown.matchAll(pattern)) {
    const [target, anchor] = match[1].replace(/\\(.)/g, "$1").split("#");
    if (!target.endsWith(".html") || target.includes("package-")) continue;
    const type = target.slice(0, -".html".length).replace(/\//g, ".");
    if (!type.startsWith("net.dv8tion.jda.")) continue;
    found.add(anchor ? `${type}#${safeDecode(anchor)}` : type);
  }

  return [...found];
}

function firstExample(markdown: string): string | null {
  const match = /```java\n([\s\S]*?)```/.exec(markdown);
  const code = match?.[1].trim();
  return code ? code : null;
}

const EMPTY: DocDetails = {
  signature: null,
  markdown: "_No inline documentation was found for this entry._",
  example: null,
  references: [],
};

async function guideDetails(entry: DocEntry): Promise<DocDetails> {
  const html = (await faqHtml(entry)) ?? (await guideHtml(entry));
  if (!html) return EMPTY;

  const markdown = turndown
    .turndown(prepare(html, WIKI_BASE + entry.page))
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    signature: null,
    markdown: markdown || "_This page has no description._",
    example: firstExample(markdown),
    references: collectReferences(markdown),
  };
}

async function javadocDetails(entry: DocEntry): Promise<DocDetails> {
  const slice = sliceAround(await fetchPage(entry.page), entry.anchor);
  if (!slice) return EMPTY;

  const { signature, html } = splitBlock(slice);
  const markdown = turndown
    .turndown(prepare(html, DOCS_BASE + entry.page))
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    signature,
    markdown: markdown || "_This entry has no description._",
    example: firstExample(markdown),
    references: collectReferences(markdown),
  };
}

export async function loadDetails(entry: DocEntry): Promise<DocDetails> {
  const cached = detailsCache.get(entry.name);
  if (cached) return JSON.parse(cached) as DocDetails;

  const details =
    entry.kind === "guide"
      ? await guideDetails(entry)
      : await javadocDetails(entry);

  detailsCache.set(entry.name, JSON.stringify(details));
  return details;
}

export interface PageTarget {
  page: string;
  base: string;
}

export function documentationPages(entries: DocEntry[]): PageTarget[] {
  const seen = new Set<string>();
  const targets: PageTarget[] = [];
  for (const entry of entries) {
    if (!entry.page) continue;
    const base = entry.kind === "guide" ? WIKI_BASE : DOCS_BASE;
    const key = base + entry.page;
    if (!seen.has(key)) {
      seen.add(key);
      targets.push({ page: entry.page, base });
    }
  }
  return targets;
}

// One unreachable page out of a thousand must not abandon the whole download,
// and a serial loop over them takes minutes that concurrency removes.
export async function prefetchPages(
  pages: PageTarget[],
  onProgress: (done: number, total: number) => void,
): Promise<number> {
  let next = 0;
  let done = 0;
  let failed = 0;

  async function worker(): Promise<void> {
    for (let at = next++; at < pages.length; at = next++) {
      try {
        await fetchPage(pages[at].page, pages[at].base, true, false);
      } catch {
        failed += 1;
      }
      onProgress(++done, pages.length);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(PREFETCH_CONCURRENCY, pages.length) },
      worker,
    ),
  );
  return failed;
}
