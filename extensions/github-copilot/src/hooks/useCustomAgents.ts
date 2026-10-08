import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { CustomAgent, getCustomAgents } from "../services/custom-agents";

const DEFAULT_CUSTOM_AGENT: CustomAgent = {
  name: "",
  repo_owner: null,
  repo_name: null,
  display_name: "Copilot",
};

// Asynchronously load available custom agents for a repository
export const useCustomAgents = (nameWithOwner: string): { customAgents: CustomAgent[]; isLoading: boolean } => {
  const {
    data: customAgents,
    isLoading,
    error,
  } = useCachedPromise(getCustomAgents, [nameWithOwner], {
    initialData: null,
    keepPreviousData: false,
  });

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load custom agents",
        message: error.message,
      });
    }
  }, [error]);

  return {
    customAgents: [DEFAULT_CUSTOM_AGENT].concat(customAgents || []),
    isLoading,
  };
};
