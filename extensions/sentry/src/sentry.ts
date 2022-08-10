import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Event, Issue, Project } from "./types";

const { token } = getPreferenceValues();
const headers = { Authorization: `Bearer ${token}`, ContentType: "application/json" };

export function useProjects() {
  return useFetch<Project[]>("https://sentry.io/api/0/projects/", { headers });
}

export function useIssues(project?: Project) {
  return useFetch<Issue[]>(`https://sentry.io/api/0/projects/${project?.organization.slug}/${project?.slug}/issues/`, {
    headers,
    execute: !!project,
  });
}

export function useLatestEvent(issue?: Issue) {
  return useFetch<Event>(`https://sentry.io/api/0/issues/${issue?.id}/events/latest/`, {
    headers,
    execute: !!issue,
  });
}
