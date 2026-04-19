export type AuthMode = "none" | "bearer" | "custom_header";

export type PaperclipPreferences = {
  apiBaseUrl: string;
  authMode?: AuthMode;
  apiKey?: string;
  customAuthHeaderName?: string;
  customAuthHeaderValue?: string;
};

export type Company = {
  id: string;
  name: string;
  status: string;
  issuePrefix: string;
};

export type Agent = {
  id: string;
  companyId: string;
  name: string;
  role: string;
  status: string;
};

export type ActiveRun = {
  id: string;
  status: string;
  agentId: string;
  startedAt: string;
  finishedAt: string | null;
};

export type Issue = {
  id: string;
  companyId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  identifier: string;
  issueNumber: number;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  activeRun: ActiveRun | null;
};

export type SearchIssuesOptions = {
  q?: string;
  status?: string;
  signal?: AbortSignal;
};

export type CreateIssueData = {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeAgentId?: string;
};

function sanitizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (!payload || typeof payload !== "object") {
    return `HTTP ${status}`;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.error === "string" && record.error) {
    return record.error;
  }

  if (record.error && typeof record.error === "object") {
    const message = (record.error as Record<string, unknown>).message;
    if (typeof message === "string" && message) {
      return message;
    }
  }

  if (typeof record.message === "string" && record.message) {
    return record.message;
  }

  return `HTTP ${status}`;
}

function getAuthHeaders(preferences: PaperclipPreferences): Record<string, string> {
  const authMode = preferences.authMode ?? "none";
  const headers: Record<string, string> = {};

  if (authMode === "bearer") {
    if (!preferences.apiKey?.trim()) {
      throw new Error("Auth mode is Bearer Token, but no token is configured in extension preferences.");
    }
    headers.Authorization = `Bearer ${preferences.apiKey.trim()}`;
  }

  if (authMode === "custom_header") {
    const headerName = preferences.customAuthHeaderName?.trim();
    const headerValue = preferences.customAuthHeaderValue?.trim();

    if (!headerName || !headerValue) {
      throw new Error("Auth mode is Custom Header, but the header name or value is missing in extension preferences.");
    }

    headers[headerName] = headerValue;
  }

  return headers;
}

async function request<T>(
  preferences: PaperclipPreferences,
  path: string,
  options?: {
    method?: "GET" | "POST";
    searchParams?: URLSearchParams;
    body?: Record<string, unknown>;
    signal?: AbortSignal;
  },
): Promise<T> {
  const baseUrl = sanitizeBaseUrl(preferences.apiBaseUrl);
  if (!baseUrl) {
    throw new Error("Paperclip Base URL is missing. Open extension preferences and add your server URL.");
  }

  const query = options?.searchParams?.toString();
  const url = `${baseUrl}${path}${query ? `?${query}` : ""}`;
  const response = await fetch(url, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(preferences),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    signal: options?.signal,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = isJson ? extractErrorMessage(payload, response.status) : `HTTP ${response.status}`;
    if (response.status === 401) {
      throw new Error(`Unauthorized: ${message}`);
    }
    throw new Error(message);
  }

  return payload as T;
}

export async function listCompanies(
  preferences: PaperclipPreferences,
  signal?: AbortSignal,
): Promise<Company[]> {
  const companies = await request<Company[]>(preferences, "/api/companies", { signal });
  return companies.filter((company) => company.status === "active");
}

export async function listIssues(
  preferences: PaperclipPreferences,
  companyId: string,
  options?: SearchIssuesOptions,
): Promise<Issue[]> {
  const searchParams = new URLSearchParams();

  if (options?.q?.trim()) {
    searchParams.set("q", options.q.trim());
  }

  if (options?.status) {
    searchParams.set("status", options.status);
  }

  return request<Issue[]>(
    preferences,
    `/api/companies/${companyId}/issues`,
    { searchParams, signal: options?.signal },
  );
}

export async function listAgents(
  preferences: PaperclipPreferences,
  companyId: string,
  signal?: AbortSignal,
): Promise<Agent[]> {
  return request<Agent[]>(preferences, `/api/companies/${companyId}/agents`, { signal });
}

export async function createIssue(
  preferences: PaperclipPreferences,
  companyId: string,
  data: CreateIssueData,
): Promise<Issue> {
  const body: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== "") {
      body[key] = value;
    }
  }

  return request<Issue>(preferences, `/api/companies/${companyId}/issues`, {
    method: "POST",
    body,
  });
}

export function buildIssueUrl(baseUrl: string, companyIssuePrefix: string, identifier: string) {
  const routePrefix = companyIssuePrefix.trim() || identifier.split("-")[0] || "";
  return `${sanitizeBaseUrl(baseUrl)}/${encodeURIComponent(routePrefix)}/issues/${encodeURIComponent(identifier)}`;
}
