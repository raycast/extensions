import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { PromptTemplate } from "./agents";

const STORAGE_KEY = "vibe-prompt-templates";

export const BUILTIN_TEMPLATES: PromptTemplate[] = [
  {
    id: "builtin:summarize-repo",
    title: "Summarize this repo",
    prompt:
      "Summarize this repository. Cover: purpose, primary language/framework, entry points, and how to run it locally.",
  },
  {
    id: "builtin:explain-last-commit",
    title: "Explain the last commit",
    prompt:
      "Explain the most recent commit on the current branch. Cover: what changed, why (based on message and diff), and any risks.",
  },
  {
    id: "builtin:review-uncommitted",
    title: "Review uncommitted changes",
    prompt:
      "Review my uncommitted changes. Flag bugs, missing tests, and anything that shouldn't be committed.",
  },
  {
    id: "builtin:fix-failing-tests",
    title: "Fix failing tests",
    prompt:
      "Run the test suite for this repo, identify failing tests, and propose fixes.",
  },
];

export function isBuiltin(id: string): boolean {
  return id.startsWith("builtin:");
}

export function newCustomId(): string {
  return `custom:${randomUUID()}`;
}

export async function loadCustomTemplates(): Promise<PromptTemplate[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PromptTemplate =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as PromptTemplate).id === "string" &&
        typeof (item as PromptTemplate).title === "string" &&
        typeof (item as PromptTemplate).prompt === "string",
    );
  } catch {
    return [];
  }
}

export async function saveCustomTemplates(
  templates: PromptTemplate[],
): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export async function upsertTemplate(
  template: PromptTemplate,
): Promise<PromptTemplate[]> {
  const existing = await loadCustomTemplates();
  const filtered = existing.filter((t) => t.id !== template.id);
  const next = [template, ...filtered];
  await saveCustomTemplates(next);
  return next;
}

export async function deleteTemplate(id: string): Promise<PromptTemplate[]> {
  const existing = await loadCustomTemplates();
  const next = existing.filter((t) => t.id !== id);
  await saveCustomTemplates(next);
  return next;
}

export async function mergedTemplates(): Promise<PromptTemplate[]> {
  const custom = await loadCustomTemplates();
  return [...BUILTIN_TEMPLATES, ...custom];
}
