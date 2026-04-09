import { Clipboard, LaunchProps, popToRoot, showHUD } from "@raycast/api";
import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

type Arguments = {
  feedback?: string;
  rating?: "good" | "needs_work" | "bad";
};

const EVALS_PATH = path.join(homedir(), "Code", "terminalcopypaste", "evals.jsonl");

function cleanText(text: string): string {
  let normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\t/g, "  ");
  const lines = normalized.split("\n");

  while (lines.length > 0 && lines[0].trim() === "") {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  const indents = lines
    .filter((line) => line.trim() !== "")
    .map((line) => (line.match(/^[ \t]*/) ?? [""])[0].length);

  if (indents.length > 0) {
    const minIndent = Math.min(...indents);
    if (minIndent > 0) {
      for (let index = 0; index < lines.length; index += 1) {
        if (lines[index].trim() !== "") {
          lines[index] = lines[index].slice(minIndent);
        }
      }
    }
  }

  normalized = lines.join("\n");
  normalized = normalized.replace(/(\w)-\n\s*(\w)/g, "$1$2");
  normalized = normalized.replace(/\/\n\s*/g, "/");

  const paragraphs = normalized.split(/\n\s*\n/);
  const cleaned: string[] = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      continue;
    }

    let compact = trimmed.replace(/\s*\n\s*/g, " ");
    compact = compact.replace(/[ \t]{2,}/g, " ");
    compact = compact.replace(/\s+([,.;:?!])/g, "$1");
    compact = compact.replace(/(?<=\/)\s+(?=[A-Za-z0-9._-])/g, "");
    cleaned.push(compact);
  }

  return `${cleaned.join("\n\n").trim()}\n`;
}

async function appendEval(raw: string, cleaned: string, rating: string, feedback: string) {
  await mkdir(path.dirname(EVALS_PATH), { recursive: true });
  const record = {
    timestamp: new Date().toISOString(),
    rating,
    feedback,
    raw,
    cleaned,
  };
  await appendFile(EVALS_PATH, `${JSON.stringify(record)}\n`, "utf8");
}

export default async function command(props: LaunchProps<{ arguments: Arguments }>) {
  const rawText = await Clipboard.readText();

  if (!rawText) {
    await showHUD("Clipboard is empty");
    return;
  }

  const cleanedText = cleanText(rawText);
  await Clipboard.copy(cleanedText);

  const feedback = props.arguments.feedback?.trim();
  if (feedback) {
    await appendEval(rawText, cleanedText, props.arguments.rating ?? "needs_work", feedback);
  }

  await showHUD("Clipboard cleaned");
  await popToRoot();
}
