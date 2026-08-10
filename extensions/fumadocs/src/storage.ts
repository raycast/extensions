import { LocalStorage } from "@raycast/api";
import { DOCS } from "./constants";
import { StoredDocsConfig } from "./types";

const STORAGE_KEY = "docs-list";

export async function initializeDocs(): Promise<StoredDocsConfig[]> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!stored) {
    const defaultDocs: StoredDocsConfig[] = DOCS.map((doc) => ({
      ...doc,
      isVisible: true,
    }));
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDocs));
    return defaultDocs;
  }
  return JSON.parse(stored);
}

export async function getAllDocs(): Promise<StoredDocsConfig[]> {
  return initializeDocs();
}

export async function getVisibleDocs(): Promise<StoredDocsConfig[]> {
  const docs = await getAllDocs();
  return docs.filter((doc) => doc.isVisible);
}

export async function saveDocs(docs: StoredDocsConfig[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

export async function addDoc(name: string, url: string): Promise<void> {
  const docs = await getAllDocs();
  const newDoc: StoredDocsConfig = {
    name,
    url,
    isVisible: true,
  };
  docs.push(newDoc);
  await saveDocs(docs);
}

export async function removeDoc(name: string): Promise<void> {
  const docs = await getAllDocs();
  const filteredDocs = docs.filter((doc) => doc.name !== name);
  await saveDocs(filteredDocs);
}

export async function toggleDocVisibility(name: string): Promise<void> {
  const docs = await getAllDocs();
  const updatedDocs = docs.map((doc) => {
    if (doc.name === name) {
      return { ...doc, isVisible: !doc.isVisible };
    }
    return doc;
  });
  await saveDocs(updatedDocs);
}

export async function resetToDefaults(): Promise<StoredDocsConfig[]> {
  await LocalStorage.removeItem(STORAGE_KEY);
  return initializeDocs();
}
