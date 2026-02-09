import { getPreferenceValues, trash } from "@raycast/api";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import type { Document, DocumentIndex } from "../types";

const INDEX_FILENAME = "index.json";
const CURRENT_VERSION = 1;

function getDefaultStoragePath(): string {
  return path.join(
    os.homedir(),
    "Library/Mobile Documents/com~apple~CloudDocs/RaycastDocs",
  );
}

export function getStoragePath(): string {
  const prefs = getPreferenceValues<{
    syncFolder?: string;
    defaultEditor?: string;
  }>();
  return prefs.syncFolder || getDefaultStoragePath();
}

export async function ensureStorageExists(): Promise<void> {
  const storagePath = getStoragePath();
  try {
    await fs.mkdir(storagePath, { recursive: true });
  } catch {
    // Directory already exists
  }
}

export async function getDocumentIndex(): Promise<DocumentIndex> {
  const storagePath = getStoragePath();
  const indexPath = path.join(storagePath, INDEX_FILENAME);

  try {
    const data = await fs.readFile(indexPath, "utf-8");
    return JSON.parse(data) as DocumentIndex;
  } catch {
    return { documents: [], version: CURRENT_VERSION };
  }
}

export async function saveDocumentIndex(index: DocumentIndex): Promise<void> {
  await ensureStorageExists();
  const storagePath = getStoragePath();
  const indexPath = path.join(storagePath, INDEX_FILENAME);

  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8");
}

export async function readDocumentContent(filename: string): Promise<string> {
  const storagePath = getStoragePath();
  const filePath = path.join(storagePath, filename);

  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

export async function writeDocumentContent(
  filename: string,
  content: string,
): Promise<void> {
  await ensureStorageExists();
  const storagePath = getStoragePath();
  const filePath = path.join(storagePath, filename);

  await fs.writeFile(filePath, content, "utf-8");
}

export async function deleteDocumentFile(filename: string): Promise<void> {
  const storagePath = getStoragePath();
  const filePath = path.join(storagePath, filename);

  try {
    await trash(filePath);
  } catch {
    // File may not exist
  }
}

export function getDocumentFilePath(filename: string): string {
  const storagePath = getStoragePath();
  return path.join(storagePath, filename);
}

export function generateFilename(title: string): string {
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${sanitized}.md`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function createDocument(
  title: string,
  tags: string[],
  content: string,
  shortcut?: string,
): Promise<Document> {
  const index = await getDocumentIndex();

  const doc: Document = {
    id: generateId(),
    title,
    tags,
    filename: generateFilename(title),
    shortcut,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Ensure unique filename
  let counter = 1;
  while (index.documents.some((d) => d.filename === doc.filename)) {
    doc.filename = generateFilename(`${title}-${counter}`);
    counter++;
  }

  index.documents.push(doc);
  await saveDocumentIndex(index);
  await writeDocumentContent(doc.filename, content);

  return doc;
}

export async function updateDocument(
  id: string,
  updates: Partial<Pick<Document, "title" | "tags" | "shortcut">>,
  content?: string,
): Promise<Document | null> {
  const index = await getDocumentIndex();
  const docIndex = index.documents.findIndex((d) => d.id === id);

  if (docIndex === -1) return null;

  const doc = index.documents[docIndex];
  const oldFilename = doc.filename;

  if (updates.title && updates.title !== doc.title) {
    doc.title = updates.title;
    const newFilename = generateFilename(updates.title);

    // Check for filename conflicts
    let counter = 1;
    let finalFilename = newFilename;
    while (
      index.documents.some((d) => d.id !== id && d.filename === finalFilename)
    ) {
      finalFilename = generateFilename(`${updates.title}-${counter}`);
      counter++;
    }

    doc.filename = finalFilename;

    // Rename file if it exists
    try {
      const existingContent = await readDocumentContent(oldFilename);
      await writeDocumentContent(finalFilename, content ?? existingContent);
      await deleteDocumentFile(oldFilename);
    } catch {
      // Handle gracefully
    }
  }

  if (updates.tags) doc.tags = updates.tags;
  if (updates.shortcut !== undefined) doc.shortcut = updates.shortcut;
  doc.updatedAt = new Date().toISOString();

  index.documents[docIndex] = doc;
  await saveDocumentIndex(index);

  if (content !== undefined) {
    await writeDocumentContent(doc.filename, content);
  }

  return doc;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const index = await getDocumentIndex();
  const docIndex = index.documents.findIndex((d) => d.id === id);

  if (docIndex === -1) return false;

  const doc = index.documents[docIndex];
  await deleteDocumentFile(doc.filename);

  index.documents.splice(docIndex, 1);
  await saveDocumentIndex(index);

  return true;
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const index = await getDocumentIndex();
  return index.documents.find((d) => d.id === id) || null;
}

export async function getDocumentByShortcut(
  shortcut: string,
): Promise<Document | null> {
  const index = await getDocumentIndex();
  return (
    index.documents.find(
      (d) => d.shortcut?.toLowerCase() === shortcut.toLowerCase(),
    ) || null
  );
}
