import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import fetch from "node-fetch";
import { URLSearchParams } from "url";
import { Event, Issue, Project, User } from "./types";
import { getBaseUrl } from "./utils";

const { token } = getPreferenceValues();
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

const baseUrl = getBaseUrl();

export function useProjects() {
  return useFetch<Project[]>(`${baseUrl}/api/0/projects/`, { headers });
}

export function useIssues(project?: Project) {
  return useFetch<Issue[]>(`${baseUrl}/api/0/projects/${project?.organization?.slug}/${project?.slug}/issues/`, {
    headers,
    execute: !!project,
  });
}

export function useIssueDetails(issue: Issue) {
  return useFetch<Issue>(`${baseUrl}/api/0/issues/${issue.id}/`, { headers });
}

export function useLatestEvent(issue: Issue) {
  return useFetch<Event>(`${baseUrl}/api/0/issues/${issue.id}/events/latest/`, {
    headers,
  });
}

export function useUsers(organizationSlug: string, projectId?: string) {
  const searchParams = new URLSearchParams();
  if (projectId) {
    searchParams.append("project", projectId);
  }

  return useFetch<User[]>(`${baseUrl}/api/0/organizations/${organizationSlug}/users/?` + searchParams, {
    headers,
  });
}

export async function updateIssue(issueId: string, payload: { assignedTo?: string | null }) {
  const body = JSON.stringify(payload);

  const response = await fetch(`${baseUrl}/api/0/issues/${issueId}/`, {
    method: "PUT",
    headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed updating ${issueId}: ${response.statusText} (${response.status})\n${text}`);
  }

  return (await response.json()) as Issue;
}
