import { Folder } from "./types";
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

  // Use API as the primary source to avoid reading large cache files
  try {
    const response = await getFolders();

    if (!response || !response.lists || typeof response.lists !== "object") {
      return [];
    }

    folders = Object.values(response.lists).map((folder: Folder) => {
      return {
        ...folder,
        document_ids: includeDocumentIds ? folder.document_ids : [],
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
