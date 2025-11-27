import { Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { deleteAllDocumentsFromStore, deleteDocumentFromStore, fetchDocumentsFromStore } from "../lib/file-search";
import { getDocuments } from "../lib/cache";
import type { StoredDocument } from "../lib/types";

interface UseDocumentListOptions {
  autoRefresh?: boolean;
  onRefreshSuccess?: (documents: StoredDocument[]) => void;
  onRefreshError?: (error: Error) => void;
}

interface UseDocumentListReturn {
  // State
  documents: StoredDocument[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;

  // Actions
  refresh: () => Promise<void>;
  loadFromCache: () => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  deleteAllDocuments: () => Promise<void>;
}

/**
 * Custom hook for managing document list
 * Handles caching, loading, and refreshing documents from Google File Search
 */
export function useDocumentList(options: UseDocumentListOptions = {}): UseDocumentListReturn {
  const { autoRefresh = true, onRefreshSuccess, onRefreshError } = options;

  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load documents from local cache
  const loadFromCache = useCallback(async () => {
    try {
      setIsLoading(true);
      const cached = await getDocuments();
      setDocuments(cached);
      setError(null);

      console.log("[useDocumentList] Loaded from cache", {
        documentCount: cached.length,
      });
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      setError(errorInstance);
      console.error("[useDocumentList] Failed to load from cache", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh documents from remote Google File Search
  const refresh = useCallback(async () => {
    setIsRefreshing(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Syncing with Google File Search",
    });

    try {
      const remoteDocs = await fetchDocumentsFromStore();
      setDocuments(remoteDocs);
      setError(null);

      toast.title = "Documents synced";
      toast.style = Toast.Style.Success;

      console.log("[useDocumentList] Refreshed from remote", {
        documentCount: remoteDocs.length,
      });

      // Call success callback if provided
      onRefreshSuccess?.(remoteDocs);
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      setError(errorInstance);

      toast.style = Toast.Style.Failure;
      toast.title = "Sync failed";
      toast.message = errorInstance.message;

      console.error("[useDocumentList] Failed to refresh from remote", error);

      // Call error callback if provided
      onRefreshError?.(errorInstance);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefreshSuccess, onRefreshError]);

  // Delete a document from the store and update local cache/state
  const deleteDocument = useCallback(async (documentId: string) => {
    setIsRefreshing(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting document",
    });

    try {
      const remainingDocs = await deleteDocumentFromStore(documentId);
      setDocuments(remainingDocs);
      setError(null);

      toast.title = "Document deleted";
      toast.style = Toast.Style.Success;

      console.log("[useDocumentList] Deleted document", { documentId });
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      setError(errorInstance);

      toast.style = Toast.Style.Failure;
      toast.title = "Delete failed";
      toast.message = errorInstance.message;

      console.error("[useDocumentList] Failed to delete document", {
        documentId,
        error,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Delete every document in the store
  const deleteAllDocuments = useCallback(async () => {
    setIsRefreshing(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting all documents",
    });

    try {
      await deleteAllDocumentsFromStore();
      setDocuments([]);
      setError(null);

      toast.title = "All documents deleted";
      toast.style = Toast.Style.Success;

      console.log("[useDocumentList] Deleted all documents");
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      setError(errorInstance);

      toast.style = Toast.Style.Failure;
      toast.title = "Bulk delete failed";
      toast.message = errorInstance.message;

      console.error("[useDocumentList] Failed to delete all documents", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load: cache first, then optionally refresh
  useEffect(() => {
    loadFromCache().then(() => {
      if (autoRefresh) {
        refresh().catch((error) => {
          console.error("[useDocumentList] Auto-refresh failed", error);
        });
      }
    });
  }, []); // Empty dependency array for initial load only

  return {
    documents,
    isLoading,
    isRefreshing,
    error,
    refresh,
    loadFromCache,
    deleteDocument,
    deleteAllDocuments,
  };
}
