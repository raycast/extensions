import { Answer, AnswerPayload, QuestionsFile } from "./types";

export const currentYear = new Date().getFullYear();

export function parseMarkdownToQuestions(markdown: string, language = "en", version?: number): QuestionsFile {
  const lines = markdown.split(/\r?\n/);
  const questions: Record<number, string> = {};

  for (const line of lines) {
    const m = line.match(/^\s*(\d+)\.\s+(.*\S)\s*$/);
    if (m) {
      const id = parseInt(m[1], 10);
      const text = m[2].trim();
      questions[id] = text;
    }
  }

  return {
    meta: { language, version: version ?? 1 },
    ...questions,
  } as QuestionsFile;
}

export function exportQuestionsAsMarkdown(
  questionsFile: QuestionsFile,
  answersFile?: Record<string, Record<string, AnswerPayload>>,
  year: number = currentYear,
): string {
  const lines: string[] = [];
  const answersForYear = answersFile ? answersFile[year] || {} : {};

  const questionEntries = Object.entries(questionsFile).filter(([k]) => k !== "meta") as [string, string][];

  for (const [k, q] of questionEntries) {
    lines.push(`${k}. ${q}`);
    const ans = answersForYear[k];
    if (ans && ans.response) {
      lines.push(ans.response);
    } else {
      lines.push("");
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function parseTextToAnswers(clipboard: string) {
  const sections = clipboard.split(/\n\s*\n(?=\d+\.)/);
  const result: Partial<Answer>[] = [];
  for (const sec of sections) {
    const lines = sec.split(/\r?\n/);
    if (lines.length === 0) continue;
    const m = lines[0].match(/^(\d+)\.\s*(.*)$/);
    if (!m) continue;
    const questionId = parseInt(m[1], 10);
    const response = lines.slice(1).join("\n").trim();
    result.push({ questionId, response });
  }
  return result;
}
