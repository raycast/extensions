import { Document } from "./types";
import { getDocumentsList } from "./fetchData";

/**
 * Get documents from API with error handling
 */
export async function getDocuments(): Promise<Document[]> {
  return await getDocumentsList();
}

/**
 * Find a document by ID with validation
 */
export async function findDocumentById(noteId: string): Promise<Document> {
  const documents = await getDocuments();
  const document = documents.find((doc) => doc.id === noteId);

  if (!document) {
    throw new Error(`Note with ID "${noteId}" not found`);
  }

  return document;
}

/**
 * Get multiple documents by IDs
 */
export async function findDocumentsByIds(
  noteIds: string[],
): Promise<Array<{ document: Document | null; noteId: string }>> {
  const documents = await getDocuments();
  return noteIds.map((noteId) => ({ noteId, document: documents.find((doc) => doc.id === noteId) || null }));
}
