import { getPreferenceValues } from "@raycast/api";
import type {
  BridgeAuthedHealth,
  BridgeErrorBody,
  BridgePublicHealth,
  IssueDetailResponse,
  SearchResultItem,
  TodayBoardResponse,
  WorkspaceItem,
} from "./types";

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

export function getBridgePreferences(): { bridgeUrl: string; bridgeToken: string } {
  const prefs = getPreferenceValues<Preferences>();
  return {
    bridgeUrl: normalizeBaseUrl(prefs.bridgeUrl || "http://127.0.0.1:17847"),
    bridgeToken: prefs.bridgeToken?.trim() ?? "",
  };
}

export class BridgeClientError extends Error {
  constructor(
    message: string,
    readonly code: "offline" | "unauthorized" | "disabled" | "pro_required" | "unknown",
  ) {
    super(message);
    this.name = "BridgeClientError";
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

function mapHttpError(status: number, body: BridgeErrorBody | null): BridgeClientError {
  const code = body?.error;
  if (status === 401 || code === "unauthorized") {
    return new BridgeClientError("Bridge token rejected. Regenerate in Mach Triage Settings.", "unauthorized");
  }
  if (status === 403 || code === "pro_required") {
    return new BridgeClientError("This action requires Mach Triage Pro.", "pro_required");
  }
  if (status === 503 || code === "bridge_disabled") {
    return new BridgeClientError("Raycast bridge is disabled in Mach Triage Settings.", "disabled");
  }
  return new BridgeClientError(`Mach Triage bridge error (${status}).`, "unknown");
}

export async function fetchPublicHealth(baseUrl: string): Promise<BridgePublicHealth> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/health`);
  } catch {
    throw new BridgeClientError(
      "Mach Triage is not reachable. Launch the desktop app and enable Raycast integration.",
      "offline",
    );
  }

  if (!response.ok) {
    const body = await parseJson<BridgeErrorBody>(response).catch(() => null);
    throw mapHttpError(response.status, body);
  }

  return parseJson<BridgePublicHealth>(response);
}

export async function fetchAuthedHealth(baseUrl: string, token: string): Promise<BridgeAuthedHealth> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/health`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Mach-Triage-Client": "raycast/status",
      },
    });
  } catch {
    throw new BridgeClientError(
      "Mach Triage is not reachable. Launch the desktop app and enable Raycast integration.",
      "offline",
    );
  }

  if (!response.ok) {
    const body = await parseJson<BridgeErrorBody>(response).catch(() => null);
    throw mapHttpError(response.status, body);
  }

  return parseJson<BridgeAuthedHealth>(response);
}

export async function verifyBridgeConnection(): Promise<BridgeAuthedHealth> {
  const { bridgeUrl, bridgeToken } = getBridgePreferences();
  if (!bridgeToken) {
    throw new BridgeClientError(
      "Set your bridge token in Raycast extension preferences (from Mach Triage Settings).",
      "unauthorized",
    );
  }
  return fetchAuthedHealth(bridgeUrl, bridgeToken);
}

async function authedFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const { bridgeUrl, bridgeToken } = getBridgePreferences();
  if (!bridgeToken) {
    throw new BridgeClientError("Set your bridge token in Raycast extension preferences.", "unauthorized");
  }

  const url = new URL(path, bridgeUrl);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${bridgeToken}`,
        "X-Mach-Triage-Client": "raycast",
      },
    });
  } catch {
    throw new BridgeClientError(
      "Mach Triage is not reachable. Launch the desktop app and enable Raycast integration.",
      "offline",
    );
  }

  if (!response.ok) {
    const body = await parseJson<BridgeErrorBody>(response).catch(() => null);
    throw mapHttpError(response.status, body);
  }

  return parseJson<T>(response);
}

export async function searchTickets(query: string, workspaceId?: string): Promise<SearchResultItem[]> {
  return authedFetch<SearchResultItem[]>("/search", {
    q: query,
    workspace_id: workspaceId ?? "",
  });
}

export async function fetchTodayBoard(workspaceId?: string): Promise<TodayBoardResponse> {
  return authedFetch<TodayBoardResponse>("/today", {
    workspace_id: workspaceId ?? "",
  });
}

export async function fetchIssueDetail(issueId: string): Promise<IssueDetailResponse> {
  return authedFetch<IssueDetailResponse>(`/issues/${issueId}`);
}

export async function fetchWorkspaces(): Promise<WorkspaceItem[]> {
  return authedFetch<WorkspaceItem[]>("/workspaces");
}

// --- Write operations ---

async function authedPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { bridgeUrl, bridgeToken } = getBridgePreferences();
  if (!bridgeToken) {
    throw new BridgeClientError("Set your bridge token in Raycast extension preferences.", "unauthorized");
  }

  const url = new URL(path, bridgeUrl);
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bridgeToken}`,
        "Content-Type": "application/json",
        "X-Mach-Triage-Client": "raycast",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new BridgeClientError(
      "Mach Triage is not reachable. Launch the desktop app and enable Raycast integration.",
      "offline",
    );
  }

  if (!response.ok) {
    const errBody = await parseJson<BridgeErrorBody>(response).catch(() => null);
    throw mapHttpError(response.status, errBody);
  }

  return parseJson<T>(response);
}

export interface MutationOk {
  ok: boolean;
}

export interface WorklogResult {
  ok: boolean;
  providerType: string;
  synced: boolean;
}

export async function updateIssueStatus(issueId: string, status: string): Promise<MutationOk> {
  return authedPost<MutationOk>(`/issues/${issueId}/status`, { status });
}

export async function addIssueComment(issueId: string, body: string, syncToProvider = true): Promise<MutationOk> {
  return authedPost<MutationOk>(`/issues/${issueId}/comments`, { body, syncToProvider });
}

export async function addIssueWorklog(
  issueId: string,
  timeSpentSeconds: number,
  comment?: string,
): Promise<WorklogResult> {
  return authedPost<WorklogResult>(`/issues/${issueId}/worklogs`, {
    timeSpentSeconds,
    ...(comment ? { comment } : {}),
  });
}
