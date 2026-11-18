import { writeFileSync, mkdirSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { Translation } from "./types";

function wordsOnly(translations: Translation[]): Translation[] {
  return translations.filter((t) => t.type === "word");
}

function sanitize(s: string): string {
  return s.replace(/[\t\n\r]/g, " ");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderAnkiBack(t: Translation): string {
  const translation = escapeHtml(t.translation);
  const posPart = t.partOfSpeech ? ` <i style="opacity:.6">(${escapeHtml(t.partOfSpeech)})</i>` : "";
  const header = `<div style="font-size:1.3em"><b>${translation}</b>${posPart}</div>`;
  if (!t.example && !t.exampleTranslation) return header;
  const exampleLine = t.example ? `<div>${escapeHtml(t.example)}</div>` : "";
  const exampleTranslationLine = t.exampleTranslation
    ? `<div style="opacity:.7">${escapeHtml(t.exampleTranslation)}</div>`
    : "";
  return `${header}<hr>${exampleLine}${exampleTranslationLine}`;
}

export function formatJson(translations: Translation[]): string {
  return JSON.stringify(translations, null, 2);
}

export function formatAnki(translations: Translation[]): string {
  const words = wordsOnly(translations);
  if (words.length === 0) return "";
  const header = "#separator:Tab\n#html:true\n#notetype:Basic\n#columns:Front\tBack";
  const rows = words.map((t) => `${sanitize(escapeHtml(t.word))}\t${sanitize(renderAnkiBack(t))}`);
  return header + "\n" + rows.join("\n") + "\n";
}

export function formatQuizlet(translations: Translation[]): string {
  const words = wordsOnly(translations);
  if (words.length === 0) return "";
  return words.map((t) => `${sanitize(t.word)}\t${sanitize(t.translation)}`).join("\n") + "\n";
}

export function exportToFile(content: string, format: "json" | "anki" | "quizlet"): string {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const ext = format === "json" ? "json" : "txt";
  const filename = `vocabuilder-${format}-${date}.${ext}`;
  const dir = join(homedir(), "Downloads");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const filePath = join(dir, filename);
  writeFileSync(filePath, content, "utf-8");
  return filePath;
}
