import { API_URL, accessToken, renewAccessToken } from "./oauth";
import { Deal, DealCategory, DealDetail, DealRequest, OwnProject, Page, Project, ProjectInput, User } from "./types";

export class APIError extends Error {
  constructor(
    readonly type: string,
    message: string,
    readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
  }

  get notFound() {
    return this.type === "not_found";
  }

  get needsElevatedAccess() {
    return this.type === "elevated_access_required";
  }
}

type Query = Record<string, string | undefined>;

async function request<T>(method: string, path: string, { query, body }: { query?: Query; body?: object } = {}) {
  const url = new URL(path, API_URL);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) url.searchParams.set(key, value);
  }

  const send = (token: string) =>
    fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body && JSON.stringify(body),
    });

  let response = await send(await accessToken());
  if (response.status === 401) response = await send(await renewAccessToken());

  if (!response.ok) throw await errorFrom(response);
  return (response.status === 204 ? undefined : await response.json()) as T;
}

async function errorFrom(response: Response): Promise<APIError> {
  try {
    const { error } = (await response.json()) as {
      error: { type: string; message: string; fields?: Record<string, string[]> };
    };
    return new APIError(error.type, error.message, error.fields);
  } catch {
    return new APIError("unknown", `Build in Public answered ${response.status}`);
  }
}

export function myProjects() {
  return request<Page<Project>>("GET", "/v1/users/me/projects").then((page) => page.data);
}

export function userProjects(userId: string) {
  return request<Page<Project>>("GET", `/v1/users/${userId}/projects`).then((page) => page.data);
}

export function searchProjects(query: { q?: string; sort?: string; cursor?: string }) {
  return request<Page<Project>>("GET", "/v1/projects", { query: { ...query, limit: "50" } });
}

export function searchUsers(query: { q?: string; sort?: string; cursor?: string }) {
  return request<Page<User>>("GET", "/v1/users", { query: { ...query, limit: "50" } });
}

export function createProject(project: ProjectInput) {
  return request<OwnProject>("POST", "/v1/projects", { body: { project } });
}

export function updateProject(id: string, project: ProjectInput) {
  return request<OwnProject>("PATCH", `/v1/projects/${id}`, { body: { project } });
}

export function deleteProject(id: string) {
  return request<void>("DELETE", `/v1/projects/${id}`);
}

export function dealCategories() {
  return request<Page<DealCategory>>("GET", "/v1/deal_categories").then((page) => page.data);
}

export function searchDeals(query: { q?: string; category?: string; cursor?: string }) {
  return request<Page<Deal>>("GET", "/v1/deals", { query: { ...query, limit: "50" } });
}

export function getDeal(slug: string) {
  return request<DealDetail>("GET", `/v1/deals/${slug}`);
}

export function requestDeal(input: { product_name: string; url?: string }) {
  return request<DealRequest>("POST", "/v1/deal_requests", { body: input });
}
