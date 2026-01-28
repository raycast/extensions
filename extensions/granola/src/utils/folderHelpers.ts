import { Folder } from "./types";
import { getFolders } from "./fetchData";

export interface FolderServiceOptions {
  includeDocumentIds?: boolean;
  signal?: AbortSignal;
}

/**
 * Get folders from API endpoint (get-document-lists-metadata)
 * Only uses fields we need: id, title, icon, document_ids
 * Counts are computed from document_ids array length
 */
export async function getFoldersFromAPI(options: FolderServiceOptions = {}): Promise<Folder[]> {
  const { includeDocumentIds = true, signal } = options;
  let folders: Folder[] = [];

  try {
    const response = await getFolders(signal);

    if (!response || !response.lists || typeof response.lists !== "object") {
      return [];
    }

    folders = Object.values(response.lists).map((folder: Folder) => {
      return {
        ...folder,
        document_ids: includeDocumentIds ? folder.document_ids || [] : [],
      };
    });

    return folders;
  } catch (apiError) {
    return [];
  }
}

/**
 * @deprecated Use getFoldersFromAPI instead. Kept for backward compatibility.
 */
export const getFoldersWithCache = getFoldersFromAPI;

/**
 * Create a mapping of document ID to folder name
 * Uses API endpoint to get folders with document_ids
 */
export async function getDocumentToFolderMapping(): Promise<Record<string, string>> {
  const folders = await getFoldersFromAPI({ includeDocumentIds: true });
  const mapping: Record<string, string> = {};

  folders.forEach((folder) => {
    folder.document_ids.forEach((docId) => {
      mapping[docId] = folder.title;
    });
  });

  return mapping;
}

/**
 * Get folder info for AI tools with note counts computed from document_ids
 * Uses API endpoint to get folders
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
  const folders = await getFoldersFromAPI({ includeDocumentIds: true });

  return folders.map((folder) => ({
    id: folder.id,
    name: folder.title,
    description: folder.description || undefined,
    noteCount: folder.document_ids.length,
    createdAt: folder.created_at,
    noteIds: folder.document_ids,
  }));
}
