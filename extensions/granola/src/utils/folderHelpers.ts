import { Folder } from "./types";
import getCache from "./getCache";
import { getFolders } from "./fetchData";

export interface FolderServiceOptions {
  includeDocumentIds?: boolean;
}

/**
 * Get folders using cache-first approach with document ID filtering
 * Consolidates the duplicated logic across multiple files
 */
export async function getFoldersWithCache(options: FolderServiceOptions = {}): Promise<Folder[]> {
  const { includeDocumentIds = true } = options;
  let folders: Folder[] = [];

  // Try cache first
  try {
    const cacheData = getCache();
    const { documentListsMetadata, documentLists, documents } = cacheData?.state || {};

    if (documentListsMetadata && documentLists && documents) {
      const actualDocuments = new Set(Object.keys(documents));

      folders = Object.entries(documentListsMetadata).map(([folderId, metadata]) => {
        const allDocumentIds = documentLists[folderId] || [];
        const actualDocumentIds = includeDocumentIds
          ? allDocumentIds.filter((docId: string) => actualDocuments.has(docId))
          : [];

        return {
          ...(metadata as Omit<Folder, "document_ids">),
          id: folderId,
          document_ids: actualDocumentIds,
        };
      });

      return folders;
    }
  } catch (error) {
    // Cache failed, continue to API fallback
  }

  // Fall back to API
  try {
    const response = await getFolders();

    if (!response || !response.lists || typeof response.lists !== "object") {
      return [];
    }

    let actualDocuments: Set<string>;
    if (includeDocumentIds) {
      try {
        const cacheData = getCache();
        actualDocuments = new Set(Object.keys(cacheData?.state?.documents || {}));
      } catch {
        actualDocuments = new Set();
      }
    } else {
      actualDocuments = new Set();
    }

    folders = Object.values(response.lists).map((folder: Folder) => {
      const filteredDocumentIds =
        includeDocumentIds && actualDocuments.size > 0
          ? folder.document_ids.filter((docId: string) => actualDocuments.has(docId))
          : includeDocumentIds
            ? folder.document_ids
            : [];

      return {
        ...folder,
        document_ids: filteredDocumentIds,
      };
    });

    return folders;
  } catch (apiError) {
    return [];
  }
}

/**
 * Create a mapping of document ID to folder name using cache-first approach
 */
export async function getDocumentToFolderMapping(): Promise<Record<string, string>> {
  const folders = await getFoldersWithCache({ includeDocumentIds: true });
  const mapping: Record<string, string> = {};

  folders.forEach((folder) => {
    folder.document_ids.forEach((docId) => {
      mapping[docId] = folder.title;
    });
  });

  return mapping;
}

/**
 * Get folder info for AI tools with note counts and metadata
 */
export async function getFolderInfoForAI(): Promise<
  Array<{
    id: string;
    name: string;
    description?: string;
    noteCount: number;
    createdAt: string;
    noteIds: string[];
  }>
> {
  const folders = await getFoldersWithCache({ includeDocumentIds: true });

  return folders.map((folder) => ({
    id: folder.id,
    name: folder.title,
    description: folder.description || undefined,
    noteCount: folder.document_ids.length,
    createdAt: folder.created_at,
    noteIds: folder.document_ids,
  }));
}
