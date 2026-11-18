import { useCachedPromise } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import type { Document } from "../types";
import {
  getDocumentIndex,
  createDocument as createDoc,
  updateDocument as updateDoc,
  deleteDocument as deleteDoc,
  readDocumentContent,
  getDocumentById,
  getDocumentByShortcut,
} from "../lib/storage";

export function useDocuments() {
  const {
    data: documents,
    isLoading,
    revalidate,
  } = useCachedPromise(async () => {
    const index = await getDocumentIndex();
    return index.documents.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, []);

  async function createDocument(
    title: string,
    tags: string[],
    content: string,
    shortcut?: string,
  ): Promise<Document | null> {
    try {
      const doc = await createDoc(title, tags, content, shortcut);
      await showToast({
        style: Toast.Style.Success,
        title: "Document created",
        message: doc.title,
      });
      revalidate();
      return doc;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create document",
        message: String(error),
      });
      return null;
    }
  }

  async function updateDocument(
    id: string,
    updates: Partial<Pick<Document, "title" | "tags" | "shortcut">>,
    content?: string,
  ): Promise<Document | null> {
    try {
      const doc = await updateDoc(id, updates, content);
      if (doc) {
        await showToast({
          style: Toast.Style.Success,
          title: "Document updated",
          message: doc.title,
        });
        revalidate();
      }
      return doc;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update document",
        message: String(error),
      });
      return null;
    }
  }

  async function deleteDocument(id: string): Promise<boolean> {
    try {
      const success = await deleteDoc(id);
      if (success) {
        await showToast({
          style: Toast.Style.Success,
          title: "Document deleted",
        });
        revalidate();
      }
      return success;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete document",
        message: String(error),
      });
      return false;
    }
  }

  return {
    documents: documents || [],
    isLoading,
    revalidate,
    createDocument,
    updateDocument,
    deleteDocument,
  };
}

export function useDocument(id: string) {
  const { data, isLoading, revalidate } = useCachedPromise(
    async (docId: string) => {
      const doc = await getDocumentById(docId);
      if (!doc) return null;

      const content = await readDocumentContent(doc.filename);
      return { document: doc, content };
    },
    [id],
  );

  return {
    document: data?.document || null,
    content: data?.content || "",
    isLoading,
    revalidate,
  };
}

export function useDocumentByShortcut(shortcut: string) {
  const { data, isLoading, revalidate } = useCachedPromise(
    async (sc: string) => {
      if (!sc) return null;
      const doc = await getDocumentByShortcut(sc);
      if (!doc) return null;

      const content = await readDocumentContent(doc.filename);
      return { document: doc, content };
    },
    [shortcut],
  );

  return {
    document: data?.document || null,
    content: data?.content || "",
    isLoading,
    revalidate,
  };
}
