import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import useSWR from "swr";
import { Project, Issue } from "./types";

async function fetcher<T>(url: string) {
  const { token } = getPreferenceValues();
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, ContentType: "application/json" },
  });
  return (await response.json()) as Promise<T>;
}

export function useProjects() {
  return useSWR<Project[]>("https://sentry.io/api/0/projects/", fetcher);
}

export function useIssues(project?: Project) {
  return useSWR<Issue[]>(
    project ? `https://sentry.io/api/0/projects/${project.organization.slug}/${project.slug}/issues/` : null,
    fetcher
  );
}
