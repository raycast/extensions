import getCache from "./getCache";
import { Document } from "./types";

/**
 * Get documents from cache with error handling
 */
export function getDocuments(): Document[] {
  const cache = getCache();
  const documents = Object.values(cache?.state?.documents || {}) as Document[];
  return documents;
}

/**
 * Find a document by ID with validation
 */
export function findDocumentById(noteId: string): Document {
  const documents = getDocuments();
  const document = documents.find((doc) => doc.id === noteId);

  if (!document) {
    throw new Error(`Note with ID "${noteId}" not found`);
  }

  return document;
}

/**
 * Get multiple documents by IDs
 */
export function findDocumentsByIds(noteIds: string[]): Array<{ document: Document | null; noteId: string }> {
  const documents = getDocuments();

  return noteIds.map((noteId) => ({
    noteId,
    document: documents.find((doc) => doc.id === noteId) || null,
  }));
}
