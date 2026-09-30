const TIMELY_API_BASE = "https://api.timelyapp.com/1.1";

export type TimelyClient = {
  id: number;
  name: string;
  color: string;
  active: boolean;
  external_id: string | null;
  updated_at: string;
};

export type TimelyProject = {
  id: number;
  name: string;
  active: boolean;
  account_id: number;
  description: string | null;
  color: string;
  rate_type: string;
  billable: boolean;
  client: TimelyClient | null;
  created_at: number;
  updated_at: number;
};

export type TimelyAccount = {
  id: number;
  name: string;
  color: string;
};

export type TimelyUser = {
  id: number;
  email: string;
  name: string;
};

function timelyFetch(accessToken: string, path: string, options: RequestInit = {}): Promise<Response> {
  const url = path.startsWith("http") ? path : `${TIMELY_API_BASE}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers as Record<string, string>),
    },
  });
}

export async function getAccounts(accessToken: string): Promise<TimelyAccount[]> {
  const res = await timelyFetch(accessToken, "/accounts");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Timely API: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }
  return (await res.json()) as TimelyAccount[];
}

export async function getProjects(accessToken: string, accountId: number): Promise<TimelyProject[]> {
  const res = await timelyFetch(accessToken, `/${accountId}/projects`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Timely API: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }
  return (await res.json()) as TimelyProject[];
}

export async function getClients(accessToken: string, accountId: number): Promise<TimelyClient[]> {
  const res = await timelyFetch(accessToken, `/${accountId}/clients?show=active`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Timely API: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }
  return (await res.json()) as TimelyClient[];
}

export async function getCurrentUser(accessToken: string, accountId: number): Promise<TimelyUser> {
  const res = await timelyFetch(accessToken, `/${accountId}/users/current`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Timely API: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }
  return (await res.json()) as TimelyUser;
}

export async function createProject(
  accessToken: string,
  accountId: number,
  params: { name: string; client_id: number; user_id: number },
): Promise<TimelyProject> {
  const res = await timelyFetch(accessToken, `/${accountId}/projects`, {
    method: "POST",
    body: JSON.stringify({
      project: {
        name: params.name,
        client_id: params.client_id,
        users: [{ user_id: params.user_id, hour_rate: 0 }],
        rate_type: "project",
        active: true,
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Timely API: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }
  return (await res.json()) as TimelyProject;
}

export function projectUrl(accountId: number, projectId: number): string {
  return `https://app.timelyapp.com/${accountId}/projects/${projectId}`;
}
