import { environment } from "@raycast/api";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CACHE_SCHEMA, docsBase, docsVersion } from "./constants";
import { fetchPage } from "./docpage";
import { DocEntry } from "./types";

const FAQ_PAGE = "faq.html";
const FAQ_TTL = 24 * 60 * 60 * 1000;
const HEADING =
  /<section id="([^"]+)">\s*(?:<span id="[^"]*"><\/span>\s*)*<(h[23])>([\s\S]*?)<\/\2>/g;

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

interface StoredFaq {
  fetchedAt: number;
  questions: { anchor: string; question: string; category: string }[];
}

function faqFile(): string {
  return path.join(
    environment.supportPath,
    `faq-${CACHE_SCHEMA}-${docsVersion()}.json`,
  );
}

function headingText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (code[0] !== "#") return ENTITIES[code.toLowerCase()] ?? entity;
      return String.fromCodePoint(
        code[1].toLowerCase() === "x"
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10),
      );
    })
    .replace(/¶/g, "")
    .trim();
}

function scan(html: string): StoredFaq["questions"] {
  const questions: StoredFaq["questions"] = [];
  let category = "FAQ";

  for (const [, anchor, level, heading] of html.matchAll(HEADING)) {
    if (level === "h2") category = headingText(heading);
    else questions.push({ anchor, question: headingText(heading), category });
  }

  return questions;
}

function toEntries(questions: StoredFaq["questions"]): DocEntry[] {
  return questions.map((question) => ({
    name: `faq.${question.anchor}`,
    display: question.question,
    module: `FAQ · ${question.category}`,
    kind: "guide" as const,
    section: "guide" as const,
    page: FAQ_PAGE,
    anchor: question.anchor,
    url: `${docsBase()}${FAQ_PAGE}#${question.anchor}`,
  }));
}

export function isFaqEntry(entry: DocEntry): boolean {
  return entry.name.startsWith("faq.");
}

export async function loadFaq(): Promise<DocEntry[]> {
  try {
    const stored = JSON.parse(await readFile(faqFile(), "utf8")) as StoredFaq;
    if (Date.now() - stored.fetchedAt < FAQ_TTL)
      return toEntries(stored.questions);
  } catch {
    // No usable cache; fall through and rebuild it.
  }

  try {
    const questions = scan(await fetchPage(FAQ_PAGE));
    await mkdir(environment.supportPath, { recursive: true });
    await writeFile(
      faqFile(),
      JSON.stringify({ fetchedAt: Date.now(), questions } satisfies StoredFaq),
      "utf8",
    );
    return toEntries(questions);
  } catch {
    return [];
  }
}
