import { showToast, Toast } from "@raycast/api";
import { UploadToFileSearchStoreOperation as UploadOperationClass } from "@google/genai";
import type { Document, DocumentState, FileSearchStore, UploadToFileSearchStoreParameters } from "@google/genai";
import { getExtensionPreferences } from "./preferences";
import { getGoogleClient } from "./google-client";
import { removeDocument, replaceDocuments } from "./cache";
import type { StoredDocument, UploadStatus } from "./types";

interface CreateStoreResult {
  id: string;
  name: string;
  displayName?: string;
}

function parseStoreName(store: FileSearchStore | string, fallbackDisplayName?: string): CreateStoreResult {
  if (typeof store === "string") {
    const id = store.split("/").pop() ?? store;
    return { id, name: store };
  }

  const name = store.name;
  const id = name.split("/").pop() ?? name;
  const displayName = store.displayName ?? fallbackDisplayName;
  return { id, name, displayName };
}

export async function ensureFileSearchStore(): Promise<CreateStoreResult> {
  const client = getGoogleClient();
  const { storeDisplayName } = getExtensionPreferences();

  const existingStore = await findExistingStore(client, storeDisplayName);
  if (existingStore) {
    return existingStore;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Creating File Search store",
  });

  try {
    const store = await client.fileSearchStores.create({
      config: {
        displayName: storeDisplayName || "Great Library",
      },
    });

    const { id, name, displayName } = parseStoreName(store, storeDisplayName);
    toast.title = "File Search store ready";
    toast.style = Toast.Style.Success;

    return { id, name, displayName };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to create File Search store";
    toast.message = error instanceof Error ? error.message : String(error);
    throw error;
  }
}

export async function uploadFileToStore(input: UploadToFileSearchStoreParameters): Promise<UploadOperationClass> {
  const client = getGoogleClient();
  return client.fileSearchStores.uploadToFileSearchStore(input);
}

export async function waitForUploadCompletion(
  operation: UploadOperationClass,
  onTick?: (op: UploadOperationClass) => void,
): Promise<UploadOperationClass> {
  let current = operation;
  const client = getGoogleClient();

  while (!current.done) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (!current.name) {
      throw new Error("Upload operation is missing a name.");
    }
    current = (await client.operations.get({ operation: current })) as UploadOperationClass;
    onTick?.(current);
  }

  if (current.error) {
    throw new Error(`Upload failed: ${JSON.stringify(current.error)}`);
  }

  return current;
}

export async function fetchDocumentsFromStore(): Promise<StoredDocument[]> {
  const { name } = await ensureFileSearchStore();
  const client = getGoogleClient();
  const pager = await client.fileSearchStores.documents.list({ parent: name, config: { pageSize: 20 } });
  const documents: StoredDocument[] = [];

  for await (const doc of pager) {
    documents.push(mapDocument(doc));
  }

  await replaceDocuments(documents);
  return documents;
}

export async function deleteDocumentFromStore(documentId: string): Promise<StoredDocument[]> {
  const { name } = await ensureFileSearchStore();
  const client = getGoogleClient();
  const resourceName = `${name}/documents/${documentId}`;

  await client.fileSearchStores.documents.delete({
    name: resourceName,
    config: { force: true },
  });

  return removeDocument(documentId);
}

export async function deleteAllDocumentsFromStore(): Promise<number> {
  const { name } = await ensureFileSearchStore();
  const client = getGoogleClient();
  const pager = await client.fileSearchStores.documents.list({ parent: name, config: { pageSize: 20 } });
  const resourceNames: string[] = [];

  for await (const doc of pager) {
    if (doc?.name) {
      resourceNames.push(doc.name);
    }
  }

  for (const resourceName of resourceNames) {
    await client.fileSearchStores.documents.delete({ name: resourceName, config: { force: true } });
  }

  await replaceDocuments([]);
  return resourceNames.length;
}

function mapDocument(document: Document): StoredDocument {
  const id = document.name ? (document.name.split("/").pop() ?? document.name) : `doc-${Date.now()}`;
  return {
    id,
    name: document.displayName || document.name || "Untitled Document",
    uploadDate: document.createTime ?? new Date().toISOString(),
    size: document.sizeBytes ? Number(document.sizeBytes) : 0,
    status: mapDocumentState(document.state),
    metadata: document.customMetadata?.reduce<Record<string, string>>((acc, entry) => {
      if (entry.key && entry.stringValue) {
        acc[entry.key] = entry.stringValue;
      }
      return acc;
    }, {}),
  };
}

function mapDocumentState(state?: DocumentState): UploadStatus {
  switch (state) {
    case "STATE_ACTIVE":
      return "indexed";
    case "STATE_PENDING":
      return "processing";
    case "STATE_FAILED":
      return "error";
    default:
      return "pending";
  }
}

async function findExistingStore(
  client: ReturnType<typeof getGoogleClient>,
  targetDisplayName: string,
): Promise<CreateStoreResult | undefined> {
  try {
    const pager = await client.fileSearchStores.list({ config: { pageSize: 20 } });
    for await (const store of pager) {
      if (!store?.name) {
        continue;
      }

      const matchesDisplayName = store.displayName === targetDisplayName;
      if (matchesDisplayName) {
        return parseStoreName(store);
      }
    }
  } catch (error) {
    console.warn("Failed to list existing file search stores", error);
  }

  return undefined;
}
