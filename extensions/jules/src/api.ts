import { getPreferenceValues } from "@raycast/api";
import { useFetch, showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";

export const API_BASE_URL = "https://jules.googleapis.com/v1alpha";

export interface Preferences {
  julesApiKey: string;
}

export type GitHubBranch = {
  displayName: string;
};

export type GitHubRepo = {
  owner: string;
  repo: string;
  defaultBranch?: GitHubBranch;
  branches?: GitHubBranch[];
};

export type Source = {
  name: string;
  id: string;
  githubRepo: GitHubRepo;
};

export type SourcesResponse = {
  sources: Source[];
  nextPageToken?: string;
};

export const API_KEY_ERROR_MESSAGE =
  "Please check your Jules API key in Settings (https://jules.google.com/settings/api)";

export function useSources() {
  const preferences = getPreferenceValues<Preferences>();
  const [selectedSource, setSelectedSource] = useState<string>("");

  const { data, isLoading, ...rest } = useFetch<SourcesResponse>(`${API_BASE_URL}/sources`, {
    headers: {
      "X-Goog-Api-Key": preferences.julesApiKey,
    },
    onError: (error) => {
      showFailureToast(error, {
        title: "Failed to fetch sources",
        message: API_KEY_ERROR_MESSAGE,
      });
    },
  });

  useEffect(() => {
    if (data?.sources && data.sources.length > 0 && !selectedSource) {
      setSelectedSource(data.sources[0].name);
    }
  }, [data]);

  return {
    data,
    isLoading,
    selectedSource,
    setSelectedSource,
    ...rest,
  };
}
