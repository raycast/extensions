import { LocalStorage } from "@raycast/api";
import { AnswerPayload, AnswersFile, QuestionsFile } from "./types";
import { parseMarkdownToQuestions } from "./questions";

export async function fetchMarkdown(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch markdown: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

export async function saveQuestionsFile(q: QuestionsFile): Promise<void> {
  const key = `questions.${q.meta.language}`;
  await LocalStorage.setItem(key, JSON.stringify(q));
}

export async function loadQuestionsFile(language: string): Promise<QuestionsFile | null> {
  const key = `questions.${language}`;
  const raw = await LocalStorage.getItem<string>(key);
  return raw ? (JSON.parse(raw) as QuestionsFile) : null;
}

export async function loadAnswersFile(): Promise<AnswersFile> {
  const raw = await LocalStorage.getItem<string>("answers");
  return raw ? (JSON.parse(raw) as AnswersFile) : {};
}

export async function saveAnswer(year: number, questionNumber: number, payload: AnswerPayload): Promise<void> {
  const raw = await LocalStorage.getItem<string>("answers");
  const answers: AnswersFile = raw ? (JSON.parse(raw) as AnswersFile) : {};
  if (!answers[year]) answers[year] = {};
  answers[year][questionNumber] = payload;
  await LocalStorage.setItem("answers", JSON.stringify(answers));
}

export async function saveAnswersFile(answers: AnswersFile): Promise<void> {
  await LocalStorage.setItem("answers", JSON.stringify(answers));
}

function buildCandidateUrlsFromRepo(
  repo: string | undefined,
  lang: string,
  type: "year" | "decade" = "year",
): string[] {
  if (!repo) return [];
  const trimmed = repo.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.includes("{lang}") ? [trimmed.replace(/{lang}/g, lang)] : [trimmed];
  }

  const parts = trimmed.split("/");
  if (parts.length < 2) return [];
  const owner = parts[0];
  const repository = parts[1];
  const rest = parts.slice(2).join("/");

  const basePaths: string[] = [];
  if (rest) {
    basePaths.push(rest.includes("{lang}") ? rest.replace(/{lang}/g, lang) : rest);
  } else {
    basePaths.push(`translations/${lang}/${type}.md`);
    basePaths.push(`${type}.md`);
  }

  const candidates: string[] = [];
  for (const branch of ["master", "main"]) {
    for (const path of basePaths) {
      candidates.push(`https://raw.githubusercontent.com/${owner}/${repository}/${branch}/${path}`);
    }
  }

  return candidates;
}

export async function ensureQuestionsLoaded(language: string, repo?: string): Promise<boolean> {
  const lang = language || "en";
  try {
    const existing = await loadQuestionsFile(lang);
    if (existing) return true;
  } catch {
    // ignore
  }

  if (!repo) return false;
  const candidates = buildCandidateUrlsFromRepo(repo, lang);
  for (const url of candidates) {
    try {
      const md = await fetchMarkdown(url);
      const r = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=1&page=1`);
      const linkHeader = r.headers.get("link");
      const pageMatch = linkHeader?.match(/page=(\d+)>;\s*rel="last"/);
      const pageCount = pageMatch ? parseInt(pageMatch[1], 10) : 1;
      const qfile = parseMarkdownToQuestions(md, lang, pageCount);
      await saveQuestionsFile(qfile);
      return true;
    } catch (e) {
      console.debug("ensureQuestionsLoaded failed for", url, e);
    }
  }

  return false;
}
