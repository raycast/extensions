import type Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "node:fs";
import { BetaMessageParam, Effort, Source, Usage } from "./claude";
import { ModelId } from "./models";
import { dataPath, readJson, removeFile, updateJson, writeJson } from "./store";
import { formatNumber, newId, oneLine } from "./text";

export type ImageType = "image/png" | "image/jpeg";

export type Attachment =
  | { kind: "selection"; text: string; source: "selection" | "clipboard" }
  | { kind: "page"; text: string; title: string; url: string; truncated: boolean }
  | { kind: "image"; path: string; mediaType: ImageType };

/** A user message exactly as sent; images are kept as file paths so the JSON stays small. */
export type StoredBlock = { type: "text"; text: string } | { type: "image"; path: string; mediaType: ImageType };

export interface Turn {
  id: string;
  createdAt: number;
  /** What the user sees as their message. */
  prompt: string;
  attachments: Attachment[];
  request: StoredBlock[];
  /** Assistant messages as received, replayed unchanged so thinking blocks stay valid. */
  replies: BetaMessageParam[];
  answer: string;
  sources: Source[];
  usage?: Usage;
  durationMs?: number;
  truncated?: boolean;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: ModelId;
  /** Overrides the effort preference, e.g. for a code review command. */
  effort?: Effort;
  /** Frozen when the conversation starts: thinking blocks are bound to the system prompt and tools. */
  system: string;
  webSearch: boolean;
  turns: Turn[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: number;
  model: string;
  turns: number;
  preview: string;
  cost: number;
}

const DIR = "conversations";
const INDEX = `${DIR}/index.json`;

export function createConversation(o: {
  model: ModelId;
  system: string;
  webSearch: boolean;
  effort?: Effort;
}): Conversation {
  const now = Date.now();
  return { id: newId(), title: "", createdAt: now, updatedAt: now, turns: [], ...o };
}

export function attachmentLabel(a: Attachment): string {
  switch (a.kind) {
    case "selection":
      return `${a.source === "clipboard" ? "Clipboard text" : "Selected text"} · ${formatNumber(a.text.length)} characters`;
    case "page":
      return a.truncated ? `${a.title} (shortened)` : a.title;
    case "image":
      return "Screenshot";
  }
}

export function turnTitle(turn: Pick<Turn, "prompt" | "attachments">): string {
  if (turn.prompt.trim()) return oneLine(turn.prompt, 120);
  return turn.attachments.length ? attachmentLabel(turn.attachments[0]) : "Empty message";
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * The user message for a turn: images first, then attached text in tags, then the request.
 * `instruction` replaces the visible prompt when a preset sends a longer hidden instruction.
 */
export function buildRequest(prompt: string, attachments: Attachment[], instruction?: string): StoredBlock[] {
  const blocks: StoredBlock[] = [];
  const parts: string[] = [];
  for (const a of attachments) {
    if (a.kind === "image") blocks.push({ type: "image", path: a.path, mediaType: a.mediaType });
    if (a.kind === "selection") parts.push(`<selected_text>\n${a.text}\n</selected_text>`);
    if (a.kind === "page") {
      parts.push(
        `<web_page title="${escapeAttribute(a.title)}" url="${escapeAttribute(a.url)}">\n${a.text}\n</web_page>`,
      );
    }
  }
  const ask = (instruction ?? prompt).trim();
  if (ask) parts.push(ask);
  blocks.push({ type: "text", text: parts.join("\n\n") || "." });
  return blocks;
}

export async function toApiContent(blocks: StoredBlock[]): Promise<Anthropic.Beta.BetaContentBlockParam[]> {
  return Promise.all(
    blocks.map(async (block): Promise<Anthropic.Beta.BetaContentBlockParam> => {
      if (block.type === "text") return { type: "text", text: block.text };
      try {
        const data = (await fs.readFile(block.path)).toString("base64");
        return { type: "image", source: { type: "base64", media_type: block.mediaType, data } };
      } catch {
        return { type: "text", text: "[The screenshot is no longer available.]" };
      }
    }),
  );
}

/** History for the API: completed turns only, each as the exact user and assistant messages. */
export async function toApiMessages(turns: Turn[]): Promise<BetaMessageParam[]> {
  const messages: BetaMessageParam[] = [];
  for (const turn of turns) {
    if (!turn.replies.length) continue;
    messages.push({ role: "user", content: await toApiContent(turn.request) }, ...turn.replies);
  }
  return messages;
}

function summarize(c: Conversation): ConversationSummary {
  const last = [...c.turns].reverse().find((turn) => turn.answer);
  return {
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt,
    model: c.model,
    turns: c.turns.length,
    preview: last ? oneLine(last.answer, 140) : "",
    cost: c.turns.reduce((sum, turn) => sum + (turn.usage?.cost ?? 0), 0),
  };
}

export async function saveConversation(c: Conversation): Promise<void> {
  if (!c.turns.some((turn) => turn.replies.length)) return;
  if (!c.title) c.title = turnTitle(c.turns[0]);
  await writeJson(`${DIR}/${c.id}.json`, c);
  await updateJson<ConversationSummary[]>(INDEX, [], (list) =>
    [summarize(c), ...list.filter((s) => s.id !== c.id)].sort((a, b) => b.updatedAt - a.updatedAt),
  );
}

export function loadConversation(id: string): Promise<Conversation | null> {
  return readJson<Conversation | null>(`${DIR}/${id}.json`, null);
}

export function listConversations(): Promise<ConversationSummary[]> {
  return readJson<ConversationSummary[]>(INDEX, []);
}

async function removeImages(c: Conversation | null): Promise<void> {
  const images =
    c?.turns.flatMap((turn) => turn.attachments.flatMap((a) => (a.kind === "image" ? [a.path] : []))) ?? [];
  await Promise.all(images.filter((p) => p.startsWith(dataPath("images"))).map((p) => fs.rm(p, { force: true })));
}

export async function deleteConversation(id: string): Promise<void> {
  await removeImages(await loadConversation(id));
  await removeFile(`${DIR}/${id}.json`);
  await updateJson<ConversationSummary[]>(INDEX, [], (list) => list.filter((s) => s.id !== id));
}

export async function deleteAllConversations(): Promise<void> {
  await removeFile(DIR);
  await removeFile("images");
  await writeJson(INDEX, []);
}
