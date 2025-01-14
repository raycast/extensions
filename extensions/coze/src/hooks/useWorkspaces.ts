import { useState, useEffect } from "react";
import { WorkSpace } from "@coze/api";
import { APIInstance } from "../services/api";

const useWorkspaces = (api?: APIInstance, defaultWorkspaceId?: string) => {
  const [workspaces, setWorkspaces] = useState<WorkSpace[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [workspaceError, setWorkspaceError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!api) return;

      try {
        setIsLoading(true);
        const data = await api.listAllWorkspaces();

        // filter the items by defaultWorkspaceId if it is provided
        const items = defaultWorkspaceId
          ? (data?.items || []).filter((item) => item.id === defaultWorkspaceId)
          : data?.items || [];

        setWorkspaces(items);
        if (items.length > 0) {
          setWorkspaceId(items[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch workspaces:", error);
        setWorkspaceError("Failed to load workspaces");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkspaces();
  }, [api, defaultWorkspaceId]);

  return {
    workspaces,
    workspaceId,
    setWorkspaceId,
    workspaceError,
    isLoading,
  };
};

export default useWorkspaces;
