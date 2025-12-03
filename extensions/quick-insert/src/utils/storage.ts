import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { Snippet } from "../types";

const SNIPPETS_KEY = "snippets";

/**
 * Get all snippets from LocalStorage
 */
export async function getSnippets(): Promise<Snippet[]> {
  const data = await LocalStorage.getItem<string>(SNIPPETS_KEY);
  if (!data) {
    return [];
  }
  return JSON.parse(data);
}

/**
 * Save a new snippet
 */
export async function saveSnippet(snippet: Omit<Snippet, "id" | "createdAt" | "updatedAt">): Promise<Snippet> {
  const snippets = await getSnippets();
  const newSnippet: Snippet = {
    ...snippet,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  snippets.push(newSnippet);
  await LocalStorage.setItem(SNIPPETS_KEY, JSON.stringify(snippets));
  return newSnippet;
}

/**
 * Update an existing snippet
 */
export async function updateSnippet(id: string, updates: Partial<Omit<Snippet, "id">>): Promise<void> {
  const snippets = await getSnippets();
  const index = snippets.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error("Snippet not found");
  }
  snippets[index] = {
    ...snippets[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await LocalStorage.setItem(SNIPPETS_KEY, JSON.stringify(snippets));
}

/**
 * Delete a snippet
 */
export async function deleteSnippet(id: string): Promise<void> {
  const snippets = await getSnippets();
  const filtered = snippets.filter((s) => s.id !== id);
  await LocalStorage.setItem(SNIPPETS_KEY, JSON.stringify(filtered));
}
