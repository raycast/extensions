import { useCachedPromise } from "@raycast/utils";

import { useWorkspaces } from "../components/WorkspaceContext";
import { getDocumentContent } from "../tools/get-document-content";
import { DocumentEntity, getDocuments } from "../tools/get-documents";

export function useDocuments(query: string = "", entity: DocumentEntity = { projectId: "" }) {
  const { workspaceKey } = useWorkspaces();
  const { data, error, isLoading, mutate } = useCachedPromise(
    (key: string, query: string, entity: DocumentEntity) => getDocuments(query, entity),
    [workspaceKey, query, entity],
    {
      failureToastOptions: { title: "Failed to load documents" },
      keepPreviousData: true,
    },
  );

  return {
    docs: data?.docs,
    docsError: error,
    isLoadingDocs: (!data && !error) || isLoading,
    supportsDocTypeahead: query.trim().length > 0 || data?.hasMoreDocs,
    mutateDocs: mutate,
  };
}

export function useDocumentContent(documentId: string) {
  const { workspaceKey } = useWorkspaces();
  const { data, error, isLoading, mutate } = useCachedPromise(
    (key: string, documentId: string) => getDocumentContent(documentId),
    [workspaceKey, documentId],
    {
      failureToastOptions: { title: "Failed to load document content" },
    },
  );

  return {
    doc: data,
    docError: error,
    isLoadingDoc: (!data && !error) || isLoading,
    mutateDoc: mutate,
  };
}
