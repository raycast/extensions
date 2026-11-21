import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { Resume } from "../types/resume";
import { parseResumeJson } from "./parseResume";

const PREFIX = "resumeDocument:v1:";
const DELETED_PREFIX = "deletedResumeDocument:v1:";

export interface ResumeDocument {
  version: 1;
  id: string;
  title: string;
  resume: Resume;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

async function readDocument(key: string, raw: unknown): Promise<ResumeDocument> {
  if (typeof raw !== "string") throw new Error(`Unreadable resume: ${key}`);
  const record = JSON.parse(raw);
  if (
    !record ||
    record.version !== 1 ||
    typeof record.id !== "string" ||
    PREFIX + record.id !== key ||
    typeof record.title !== "string" ||
    !record.title.trim() ||
    typeof record.createdAt !== "string" ||
    !Number.isFinite(Date.parse(record.createdAt)) ||
    typeof record.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(record.updatedAt)) ||
    (record.sourceUrl !== undefined && typeof record.sourceUrl !== "string")
  )
    throw new Error(`Invalid saved resume: ${key}`);
  await parseResumeJson(JSON.stringify(record.resume));
  return record as ResumeDocument;
}

async function cleanupDeletedDocument(key: string) {
  try {
    await LocalStorage.removeItem(key);
  } catch {
    // The deletion marker is authoritative. A later listing retries cleanup.
  }
}

export async function listResumeDocuments() {
  const items = await LocalStorage.allItems();
  const documents: ResumeDocument[] = [];
  const warnings: string[] = [];
  for (const [key, raw] of Object.entries(items)) {
    if (!key.startsWith(PREFIX)) continue;
    if (items[DELETED_PREFIX + key.slice(PREFIX.length)] !== undefined) {
      await cleanupDeletedDocument(key);
      continue;
    }
    try {
      documents.push(await readDocument(key, raw));
    } catch {
      warnings.push(`Could not read ${key}. Stored data was preserved.`);
    }
  }
  documents.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
  return { documents, warnings };
}

export async function getResumeDocument(id: string): Promise<ResumeDocument> {
  const raw = await LocalStorage.getItem<string>(PREFIX + id);
  if (raw === undefined) throw new Error(`Saved resume not found: ${id}`);
  const document = await readDocument(PREFIX + id, raw);
  if ((await LocalStorage.getItem(DELETED_PREFIX + id)) !== undefined) {
    throw new Error(`Saved resume not found: ${id}`);
  }
  return document;
}

function requireTitle(title: string) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title is required.");
  return trimmed;
}

export async function createResumeDocument(input: { title: string; resumeJson: string; sourceUrl?: string }) {
  const title = requireTitle(input.title);
  const resume = await parseResumeJson(input.resumeJson);
  const now = new Date().toISOString();
  const document: ResumeDocument = {
    version: 1,
    id: randomUUID(),
    title,
    resume,
    sourceUrl: input.sourceUrl,
    createdAt: now,
    updatedAt: now,
  };
  await LocalStorage.setItem(PREFIX + document.id, JSON.stringify(document));
  return document;
}

export async function updateResumeDocument(input: { id: string; title: string; resumeJson: string }) {
  const title = requireTitle(input.title);
  const resume = await parseResumeJson(input.resumeJson);
  const previous = await getResumeDocument(input.id);
  const document = { ...previous, title, resume, updatedAt: new Date().toISOString() };
  await LocalStorage.setItem(PREFIX + document.id, JSON.stringify(document));
  if ((await LocalStorage.getItem(DELETED_PREFIX + document.id)) !== undefined) {
    await cleanupDeletedDocument(PREFIX + document.id);
    throw new Error(`Saved resume not found: ${document.id}`);
  }
  return document;
}

export async function deleteResumeDocument(id: string) {
  await getResumeDocument(id);
  // Keep a permanent marker so updates in other executions cannot restore this ID.
  await LocalStorage.setItem(DELETED_PREFIX + id, true);
  await cleanupDeletedDocument(PREFIX + id);
}
