import { useFetch } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { Preferences, Project, MergeRequest } from "../types/gitlab";
import { GITLAB_API_ENDPOINTS } from "../constants/app";

const useGitLabHeaders = () => {
  const preferences = getPreferenceValues<Preferences>();
  return {
    "PRIVATE-TOKEN": preferences.gitlabToken,
    "Content-Type": "application/json",
  };
};

export const useProjects = () => {
  const preferences = getPreferenceValues<Preferences>();
  const headers = useGitLabHeaders();

  return useFetch<Project[]>(
    `${preferences.gitlabUrl}${GITLAB_API_ENDPOINTS.PROJECTS}?membership=true&simple=true&per_page=100`,
    { headers }
  );
};

export const useMergeRequests = (projectId: number) => {
  const preferences = getPreferenceValues<Preferences>();
  const headers = useGitLabHeaders();

  return useFetch<MergeRequest[]>(
    `${preferences.gitlabUrl}${GITLAB_API_ENDPOINTS.MERGE_REQUESTS(projectId)}?state=opened`,
    { headers }
  );
};
