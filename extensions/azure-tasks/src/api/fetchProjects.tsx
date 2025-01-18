import { useFetch } from "@raycast/utils";
import { baseApiUrl, preparedPersonalAccessToken } from "../preferences";
import { ProjectResponse } from "../models/project";

export const fetchProjects = () => {
  const { data, isLoading, error } = useFetch<ProjectResponse>(`${baseApiUrl()}/_apis/projects`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${preparedPersonalAccessToken()}`,
    },
  });

  return { data, isLoading, error };
};
