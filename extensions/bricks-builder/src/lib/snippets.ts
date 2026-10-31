import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";

export type SnippetKind = "elements" | "css" | "js" | "html" | "text";

export const SNIPPET_KINDS: { value: SnippetKind; title: string }[] = [
  { value: "elements", title: "Bricks Elements" },
  { value: "css", title: "CSS" },
  { value: "js", title: "JavaScript" },
  { value: "html", title: "HTML" },
  { value: "text", title: "Text" },
];

export interface Snippet {
  id: string;
  name: string;
  kind: SnippetKind;
  content: string;
  tags?: string[];
  updatedAt: number;
}

const STORAGE_KEY = "snippets";

export async function loadSnippets(): Promise<Snippet[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as Snippet[]).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

async function saveSnippets(snippets: Snippet[]) {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
}

export async function upsertSnippet(snippet: Omit<Snippet, "id" | "updatedAt"> & { id?: string }): Promise<Snippet> {
  const snippets = await loadSnippets();
  const saved: Snippet = { ...snippet, id: snippet.id ?? randomUUID(), updatedAt: Date.now() };
  const index = snippets.findIndex((s) => s.id === saved.id);
  if (index >= 0) snippets[index] = saved;
  else snippets.push(saved);
  await saveSnippets(snippets);
  return saved;
}

/** Adds or updates snippets from an export, matching by id. */
export async function importSnippets(incoming: Snippet[]): Promise<{ added: number; updated: number }> {
  const snippets = await loadSnippets();
  let added = 0;
  let updated = 0;
  for (const raw of incoming) {
    if (!raw || typeof raw.name !== "string" || typeof raw.content !== "string") continue;
    const snippet: Snippet = {
      ...raw,
      id: typeof raw.id === "string" ? raw.id : randomUUID(),
      kind: SNIPPET_KINDS.some((k) => k.value === raw.kind) ? raw.kind : "text",
      updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
    };
    const index = snippets.findIndex((s) => s.id === snippet.id);
    if (index >= 0) {
      snippets[index] = snippet;
      updated++;
    } else {
      snippets.push(snippet);
      added++;
    }
  }
  await saveSnippets(snippets);
  return { added, updated };
}

export async function removeSnippet(id: string) {
  await saveSnippets((await loadSnippets()).filter((s) => s.id !== id));
}

interface BricksClipboard {
  source: string;
  content: { id: string; name: string; parent: string | number; label?: string; settings?: Record<string, unknown> }[];
  sourceUrl?: string;
}

/** Parses what Bricks puts on the clipboard when you copy elements (⌘C in the builder). */
export function parseBricksElements(text: string): BricksClipboard | undefined {
  try {
    const data = JSON.parse(text) as BricksClipboard;
    if (data?.source === "bricksCopiedElements" && Array.isArray(data.content) && data.content.length > 0) {
      return data;
    }
  } catch {
    // Not JSON.
  }
  return undefined;
}

/** A readable default name for copied elements, e.g. "Hero Section (12 elements)". */
export function describeElements(data: BricksClipboard): string {
  const roots = data.content.filter((el) => !data.content.some((other) => String(other.id) === String(el.parent)));
  const root = roots[0] ?? data.content[0];
  const label = root.label || root.name.replace(/(^|-)(\w)/g, (_, dash, c) => (dash ? " " : "") + c.toUpperCase());
  const extra = roots.length > 1 ? ` + ${roots.length - 1} more` : "";
  return `${label}${extra} (${data.content.length} element${data.content.length === 1 ? "" : "s"})`;
}

/** Guesses the kind of a piece of text. */
export function detectKind(text: string): SnippetKind {
  if (parseBricksElements(text)) return "elements";
  const trimmed = text.trim();
  if (/^<[a-z!]/i.test(trimmed)) return "html";
  if (/^(const|let|var|function|document\.|window\.|import |\(\(\)|\(function)/.test(trimmed)) return "js";
  if (/[.#:@\w-][^{}]*\{[^}]*:[^}]*\}/.test(trimmed)) return "css";
  return "text";
}
