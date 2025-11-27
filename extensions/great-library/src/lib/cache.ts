import { LocalStorage } from "@raycast/api";
import { CacheState, StoredDocument } from "./types";

const CACHE_KEY = "great-library-cache";

const defaultState: CacheState = {
  documents: [],
};

async function readState(): Promise<CacheState> {
  const raw = await LocalStorage.getItem<string>(CACHE_KEY);

  if (!raw) {
    return { ...defaultState };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      fileSearchStoreId: parsed.fileSearchStoreId,
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
    };
  } catch {
    return { ...defaultState };
  }
}

async function writeState(state: CacheState) {
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(state));
}

async function mutateState(mutator: (state: CacheState) => CacheState): Promise<CacheState> {
  const current = await readState();
  const next = mutator(current);
  await writeState(next);
  return next;
}

export async function getFileSearchStoreId(): Promise<string | undefined> {
  const { fileSearchStoreId } = await readState();
  return fileSearchStoreId;
}

export async function setFileSearchStoreId(id: string): Promise<void> {
  await mutateState((state) => ({
    ...state,
    fileSearchStoreId: id,
  }));
}

export async function getDocuments(): Promise<StoredDocument[]> {
  const { documents } = await readState();
  return documents;
}

export async function upsertDocuments(newDocs: StoredDocument[]): Promise<StoredDocument[]> {
  const map = new Map<string, StoredDocument>();

  (await getDocuments()).forEach((doc) => map.set(doc.id, doc));
  newDocs.forEach((doc) => map.set(doc.id, doc));

  const nextList = Array.from(map.values()).sort((a, b) => (a.uploadDate < b.uploadDate ? 1 : -1));

  await mutateState((state) => ({
    ...state,
    documents: nextList,
  }));

  return nextList;
}

export async function replaceDocuments(documents: StoredDocument[]): Promise<void> {
  await mutateState((state) => ({
    ...state,
    documents,
  }));
}

export async function removeDocument(documentId: string): Promise<StoredDocument[]> {
  const nextState = await mutateState((state) => ({
    ...state,
    documents: state.documents.filter((doc) => doc.id !== documentId),
  }));

  return nextState.documents;
}

export async function clearCache(): Promise<void> {
  await writeState({ ...defaultState });
}
