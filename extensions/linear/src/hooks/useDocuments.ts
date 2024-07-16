import { useCachedPromise } from "@raycast/utils";

import { DocumentEntity, getDocumentContent, getDocuments } from "../api/documents";

export function useDocuments(query: string = "", entity: DocumentEntity = { projectId: "" }) {
  const { data, error, isLoading, mutate } = useCachedPromise(getDocuments, [query, entity], {
    failureToastOptions: { title: "Failed to load documents" },
    keepPreviousData: true,
  });

  return {
    docs: data?.docs,
    docsError: error,
    isLoadingDocs: (!data && !error) || isLoading,
    supportsDocTypeahead: query.trim().length > 0 || data?.hasMoreDocs,
    mutateDocs: mutate,
  };
}

export function useDocumentContent(documentId: string) {
  const { data, error, isLoading } = useCachedPromise(getDocumentContent, [documentId], {
    failureToastOptions: { title: "Failed to load document content" },
  });

  return {
    content: data?.content,
    contentError: error,
    isLoadingContent: (!data && !error) || isLoading,
  };
}
