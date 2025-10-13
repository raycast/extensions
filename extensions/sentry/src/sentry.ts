import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise, useFetch } from "@raycast/utils";
import { parse } from "http-link-header";
import fetch from "node-fetch";
import { URLSearchParams } from "url";
import { Event, Issue, Project, User } from "./types";
import { getDefaultBaseUrl } from "./utils";

const { token } = getPreferenceValues();
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

const defaultBaseUrl = getDefaultBaseUrl();

async function fetchProjects(baseUrl: string) {
  const path = `/api/0/projects/`;
  const response = await fetch(`${baseUrl}${path}`, { headers });
  const projects = (await response.json()) as Project[];
  return projects.map((project) => ({ ...project, baseUrl }));
}

export function useProjects() {
  const { url } = getPreferenceValues();

  return useCachedPromise(async () => {
    const baseUrl = url?.replace(/\/$/, "");

    if (!baseUrl || baseUrl === "https://sentry.io") {
      return (await Promise.all(["https://de.sentry.io", "https://sentry.io"].map(fetchProjects))).flat();
    }
    return await fetchProjects(baseUrl);
  });
}

export function useIssues(project?: Project) {
  return useCachedPromise(
    (organizationSlug?: string, projectSlug?: string) =>
      async ({ page, cursor }) => {
        if (page > 0 && !cursor) {
          return { data: [] as Issue[], hasMore: false };
        }
        const url =
          page === 0
            ? `${project?.baseUrl || defaultBaseUrl}/api/0/projects/${organizationSlug}/${projectSlug}/issues/`
            : cursor;
        const response = await fetch(url, { headers });
        const data = ((await response.json()) as Issue[]).map((issue) => ({
          ...issue,
          baseUrl: project?.baseUrl || defaultBaseUrl,
        })) as Issue[];
        let nextCursor: string | undefined = undefined;
        const linkHeader = parse(response.headers.get("link") ?? "");
        if (linkHeader) {
          const next = linkHeader.refs.find((ref) => ref.rel === "next");
          nextCursor = next?.uri;
        }
        return { hasMore: Boolean(nextCursor) && data.length > 0, data, cursor: nextCursor };
      },
    [project?.organization?.slug, project?.slug],
    { execute: !!project }
  );
}

export function useIssueDetails(issue: Issue) {
  return useFetch<Issue>(`${issue?.baseUrl || defaultBaseUrl}/api/0/issues/${issue.id}/`, { headers });
}

export function useLatestEvent(issue: Issue) {
  return useFetch<Event>(`${issue?.baseUrl || defaultBaseUrl}/api/0/issues/${issue.id}/events/latest/`, {
    headers,
  });
}

export function useUsers(organizationSlug: string, projectId?: string) {
  const searchParams = new URLSearchParams();
  if (projectId) {
    searchParams.append("project", projectId);
  }

  return useFetch<User[]>(`${defaultBaseUrl}/api/0/organizations/${organizationSlug}/users/?` + searchParams, {
    headers,
  });
}

export async function updateIssue(issue: Issue, payload: { assignedTo?: string | null }) {
  const body = JSON.stringify(payload);

  const response = await fetch(`${issue.baseUrl || defaultBaseUrl}/api/0/issues/${issue.id}/`, {
    method: "PUT",
    headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed updating ${issue.id}: ${response.statusText} (${response.status})\n${text}`);
  }

  return (await response.json()) as Issue;
}
