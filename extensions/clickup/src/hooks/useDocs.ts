import { DocsResponse } from "../types/docs.dt";
import useClickUp from "./useClickUp";

export default function useDocs(workspaceId: string) {
  const { isLoading, data } = useClickUp<DocsResponse>(`/workspaces/${workspaceId}/docs`, { apiVersion: 3 });
  return { isLoading, docs: data?.docs ?? [] };
}
