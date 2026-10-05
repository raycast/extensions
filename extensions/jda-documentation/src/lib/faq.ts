import { environment } from "@raycast/api";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CACHE_SCHEMA, WIKI_BASE } from "./constants";
import { fetchPage } from "./pages";
import { DocEntry } from "./types";
import { FAQ_PAGE, TROUBLESHOOTING_PAGE } from "./wiki";

const FAQ_TTL = 24 * 60 * 60 * 1000;

interface FaqQuestion {
  question: string;
  html: string;
}

interface StoredFaq {
  fetchedAt: number;
  questions: FaqQuestion[];
}

let cached: StoredFaq | null = null;

function faqFile(): string {
  return path.join(environment.supportPath, `faq-${CACHE_SCHEMA}.json`);
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// The JDA FAQ is a flat list of <details class="question"> blocks with no
// anchors of their own, so each question becomes a synthetic entry.
function scan(html: string): FaqQuestion[] {
  const questions: FaqQuestion[] = [];
  const open = /<details[^>]*class="[^"]*question[^"]*"[^>]*>/g;

  let match = open.exec(html);
  while (match) {
    const start = match.index + match[0].length;
    const end = html.indexOf("</details>", start);
    if (end === -1) break;

    const block = html.slice(start, end);
    const summary = /<summary[^>]*>([\s\S]*?)<\/summary>/.exec(block);
    if (summary) {
      questions.push({
        question: stripTags(summary[1]),
        html: block.slice(summary.index + summary[0].length),
      });
    }

    open.lastIndex = end;
    match = open.exec(html);
  }

  return questions;
}

async function ensureFaq(force = false): Promise<StoredFaq> {
  if (cached && !force && Date.now() - cached.fetchedAt < FAQ_TTL)
    return cached;

  if (!force) {
    try {
      const stored = JSON.parse(await readFile(faqFile(), "utf8")) as StoredFaq;
      if (stored.questions?.length && Date.now() - stored.fetchedAt < FAQ_TTL) {
        cached = stored;
        return stored;
      }
    } catch {
      // No usable cache; fall through and rebuild it.
    }
  }

  const questions = scan(await fetchPage(FAQ_PAGE, WIKI_BASE, force));
  const stored: StoredFaq = { fetchedAt: Date.now(), questions };
  await mkdir(environment.supportPath, { recursive: true });
  await writeFile(faqFile(), JSON.stringify(stored), "utf8");
  cached = stored;
  return stored;
}

function toEntries(questions: FaqQuestion[]): DocEntry[] {
  return questions.map((question, index) => ({
    name: `faq:${index}`,
    display: question.question,
    pkg: "FAQ",
    owner: "",
    kind: "guide" as const,
    section: "guide" as const,
    page: FAQ_PAGE,
    anchor: "",
    url: WIKI_BASE + FAQ_PAGE,
  }));
}

export function isFaqEntry(entry: DocEntry): boolean {
  return entry.name.startsWith("faq:") || entry.page === TROUBLESHOOTING_PAGE;
}

export async function loadFaq(): Promise<DocEntry[]> {
  try {
    return toEntries((await ensureFaq()).questions);
  } catch {
    return [];
  }
}

export async function refreshFaq(): Promise<DocEntry[]> {
  return toEntries((await ensureFaq(true)).questions);
}

export async function faqHtml(entry: DocEntry): Promise<string | null> {
  if (!entry.name.startsWith("faq:")) return null;
  const index = Number(entry.name.slice("faq:".length));
  const stored = await ensureFaq();
  return stored.questions[index]?.html ?? null;
}
