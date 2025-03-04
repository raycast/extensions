import { DocPageItem } from "../types/doc-pages.dt";
import useClickUp from "./useClickUp";

export default function useDocPages(workspaceId: string, docId: string) {
  const { isLoading, data } = useClickUp<DocPageItem[]>(`/workspaces/${workspaceId}/docs/${docId}/pages`, {
    apiVersion: 3,
  });
  return { isLoading, pages: data ?? [] };
}
