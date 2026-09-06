import { environment } from "@raycast/api";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "node-html-parser";
import { CACHE_SCHEMA, docsBase, docsVersion } from "./constants";
import { fetchPage } from "./docpage";
import { DocEntry } from "./types";

const FAQ_PAGE = "faq.html";
const FAQ_TTL = 24 * 60 * 60 * 1000;

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

function scan(html: string): StoredFaq["questions"] {
  const questions: StoredFaq["questions"] = [];
  const root = parse(html);

  for (const section of root.querySelectorAll("section")) {
    const heading = section.querySelector("h3");
    const anchor = section.getAttribute("id");
    if (!heading || !anchor || heading.parentNode !== section) continue;

    const category =
      section.parentNode?.querySelector("h2")?.text.replace(/¶/g, "").trim() ??
      "FAQ";
    questions.push({
      anchor,
      question: heading.text.replace(/¶/g, "").trim(),
      category,
    });
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
