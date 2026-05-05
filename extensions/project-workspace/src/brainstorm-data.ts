import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";

import { Brainstorm } from "./brainstorm-types";

const BRAINSTORMS_FILE = path.join(environment.supportPath, "brainstorms.json");

function ensureSupportDir(): void {
  if (!fs.existsSync(environment.supportPath)) {
    fs.mkdirSync(environment.supportPath, { recursive: true });
  }
}

export function loadBrainstorms(): Brainstorm[] {
  ensureSupportDir();
  if (!fs.existsSync(BRAINSTORMS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(BRAINSTORMS_FILE, "utf-8")) as Brainstorm[];
  } catch {
    return [];
  }
}

function saveBrainstorms(brainstorms: Brainstorm[]): void {
  ensureSupportDir();
  fs.writeFileSync(BRAINSTORMS_FILE, JSON.stringify(brainstorms, null, 2), "utf-8");
}

export function createBrainstorm(fields: { title: string; content: string; projectPath?: string }): Brainstorm {
  const brainstorms = loadBrainstorms();
  const now = new Date().toISOString();
  const brainstorm: Brainstorm = {
    id: crypto.randomUUID(),
    title: fields.title,
    content: fields.content,
    projectPath: fields.projectPath,
    createdAt: now,
    updatedAt: now,
  };
  saveBrainstorms([brainstorm, ...brainstorms]);
  return brainstorm;
}

export function updateBrainstorm(
  id: string,
  fields: Partial<Pick<Brainstorm, "title" | "content" | "projectPath">>,
): Brainstorm | null {
  const brainstorms = loadBrainstorms();
  const index = brainstorms.findIndex((b) => b.id === id);
  if (index === -1) return null;
  const updated: Brainstorm = { ...brainstorms[index], ...fields, updatedAt: new Date().toISOString() };
  brainstorms[index] = updated;
  saveBrainstorms(brainstorms);
  return updated;
}

export function deleteBrainstorm(id: string): boolean {
  const brainstorms = loadBrainstorms();
  const filtered = brainstorms.filter((b) => b.id !== id);
  if (filtered.length === brainstorms.length) return false;
  saveBrainstorms(filtered);
  return true;
}
