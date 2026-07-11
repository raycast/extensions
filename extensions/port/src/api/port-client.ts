import { getBaseUrl, getPortPreferences } from "../utils/preferences";

// Token cache
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

// Types
export interface PortPage {
  identifier: string;
  title: string | null;
  type: string;
  icon: string | null;
  locked?: boolean;
  parent?: string;
}

export interface PortAction {
  identifier: string;
  title: string;
  description?: string;
  icon?: string;
  blueprint?: string;
  trigger: {
    type: string;
    operation?: string;
    userInputs?: {
      properties: Record<string, PortActionInput>;
      required?: string[];
    };
  };
}

export interface PortActionInput {
  type: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  enumColors?: Record<string, string>;
}

export interface PortActionRun {
  ok: boolean;
  run: {
    id: string;
    status: string;
    link?: string;
  };
}

export interface PortAIResponse {
  ok: boolean;
  answer: string;
  references?: Array<{
    title: string;
    url?: string;
  }>;
}

export interface PortEntity {
  identifier: string;
  title: string;
  blueprint: string;
  properties: Record<string, unknown>;
  relations: Record<string, string | string[] | null>;
  icon?: string;
  team?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  ok: boolean;
  entities: PortEntity[];
}

// Authentication
async function getAccessToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && tokenExpiry > now + 60000) {
    return cachedToken;
  }

  const { clientId, clientSecret } = getPortPreferences();
  const baseUrl = getBaseUrl();

  const response = await fetch(`${baseUrl}/v1/auth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientId,
      clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Authentication failed: ${error}`);
  }

  const data = (await response.json()) as {
    accessToken: string;
    expiresIn: number;
  };

  cachedToken = data.accessToken;
  // Token expires in expiresIn seconds, convert to milliseconds
  tokenExpiry = now + (data.expiresIn || 3600) * 1000;

  return cachedToken;
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  // If unauthorized, clear cache and retry once
  if (response.status === 401) {
    cachedToken = null;
    tokenExpiry = 0;
    const newToken = await getAccessToken();

    return fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${newToken}`,
        "Content-Type": "application/json",
      },
    });
  }

  return response;
}

// API Methods

export async function getPages(): Promise<PortPage[]> {
  const response = await fetchWithAuth("/v1/pages");

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch pages: ${error}`);
  }

  const data = (await response.json()) as { ok: boolean; pages: PortPage[] };
  return data.pages || [];
}

export async function getActions(): Promise<PortAction[]> {
  const response = await fetchWithAuth("/v1/actions");

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch actions: ${error}`);
  }

  const data = (await response.json()) as {
    ok: boolean;
    actions: PortAction[];
  };
  return data.actions || [];
}

export async function getAction(identifier: string): Promise<PortAction> {
  const response = await fetchWithAuth(`/v1/actions/${identifier}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch action: ${error}`);
  }

  const data = (await response.json()) as { ok: boolean; action: PortAction };
  return data.action;
}

export async function runAction(
  actionIdentifier: string,
  inputs: Record<string, unknown>,
  entityIdentifier?: string,
  blueprintIdentifier?: string,
): Promise<PortActionRun> {
  const body: Record<string, unknown> = {
    properties: inputs,
  };

  if (entityIdentifier) {
    body.entity = entityIdentifier;
  }

  if (blueprintIdentifier) {
    body.blueprint = blueprintIdentifier;
  }

  const response = await fetchWithAuth(`/v1/actions/${actionIdentifier}/runs`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to run action: ${error}`);
  }

  return (await response.json()) as PortActionRun;
}

export async function askPortAI(question: string): Promise<PortAIResponse> {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();

  // Port AI uses SSE streaming, so we need to handle the response differently
  const response = await fetch(`${baseUrl}/v1/ai/invoke`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userPrompt: question,
      tools: [],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to ask Port AI: ${error}`);
  }

  // Parse SSE response to extract the answer
  const text = await response.text();
  let answer = "";

  // Parse SSE events - look for execution events which contain the AI response
  // Format: "event: execution\ndata: <text>"
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("event: execution")) {
      // Next line should be the data (plain text, not JSON)
      const dataLine = lines[i + 1];
      if (dataLine && dataLine.startsWith("data: ")) {
        answer += dataLine.slice(6); // Remove "data: " prefix
      }
    }
  }

  // Convert escaped newlines to actual newlines for proper markdown rendering
  const formattedAnswer = answer.replace(/\\n/g, "\n");

  return {
    ok: true,
    answer: formattedAnswer || "No response received from Port AI",
  };
}

export function getPortUrl(page: PortPage): string {
  const { baseUrl } = getPortPreferences();
  const appUrl = baseUrl ? baseUrl.replace("api.", "app.").replace("/v1", "") : "https://app.getport.io";

  return `${appUrl}/${page.identifier}`;
}

export function getActionUrl(action: PortAction): string {
  const { baseUrl } = getPortPreferences();
  const appUrl = baseUrl ? baseUrl.replace("api.", "app.").replace("/v1", "") : "https://app.getport.io";

  return `${appUrl}/self-serve?action=${action.identifier}`;
}

export async function searchEntities(query: string): Promise<PortEntity[]> {
  if (!query.trim()) {
    return [];
  }

  // Convert to lowercase for case-insensitive search
  const searchQuery = query.toLowerCase();

  const response = await fetchWithAuth("/v1/entities/search", {
    method: "POST",
    body: JSON.stringify({
      combinator: "or",
      rules: [
        {
          property: "$title",
          operator: "contains",
          value: searchQuery,
        },
        {
          property: "$identifier",
          operator: "contains",
          value: searchQuery,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to search entities: ${error}`);
  }

  const data = (await response.json()) as SearchResult;
  return data.entities || [];
}

export function getEntityUrl(entity: PortEntity): string {
  const { baseUrl } = getPortPreferences();
  const appUrl = baseUrl ? baseUrl.replace("api.", "app.").replace("/v1", "") : "https://app.getport.io";

  return `${appUrl}/${entity.blueprint}Entity?identifier=${encodeURIComponent(entity.identifier)}`;
}
