import { version as PKG_VERSION } from "../../package.json";
import { ApiError, type ErrorCode } from "./errors";

export const USER_AGENT = `vaulted-raycast/${PKG_VERSION}`;

export interface CreateSecretParams {
  ciphertext: string;
  iv: string;
  maxViews: number;
  ttl: number;
  hasPassphrase: boolean;
}

export interface CreateSecretResult {
  id: string;
  statusToken: string;
}

export interface RetrieveSecretResult {
  ciphertext: string;
  iv: string;
  hasPassphrase: boolean;
  viewsRemaining: number;
}

export async function createSecret(
  host: string,
  params: CreateSecretParams,
): Promise<CreateSecretResult> {
  let response: Response;
  try {
    response = await fetch(`${host}/api/secrets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify(params),
    });
  } catch {
    throw new ApiError("Unable to reach the Vaulted API", 0, "API_UNREACHABLE");
  }

  if (!response.ok) {
    const body = await parseErrorBody(response);
    const code: ErrorCode =
      response.status >= 500 ? "API_UNREACHABLE" : "INVALID_INPUT";
    throw new ApiError(
      errorMessage(body, response.status),
      response.status,
      code,
      body,
    );
  }

  const data = (await response.json()) as CreateSecretResult;
  return { id: data.id, statusToken: data.statusToken };
}

export async function retrieveSecret(
  host: string,
  id: string,
): Promise<RetrieveSecretResult> {
  let response: Response;
  try {
    response = await fetch(`${host}/api/secrets/${id}`, {
      method: "GET",
      headers: { "User-Agent": USER_AGENT },
    });
  } catch {
    throw new ApiError("Unable to reach the Vaulted API", 0, "API_UNREACHABLE");
  }

  if (!response.ok) {
    const body = await parseErrorBody(response);
    let code: ErrorCode;
    if (response.status === 404) code = "SECRET_NOT_FOUND";
    else if (response.status >= 500) code = "API_UNREACHABLE";
    else code = "API_ERROR";
    throw new ApiError(
      errorMessage(body, response.status),
      response.status,
      code,
      body,
    );
  }

  const data = (await response.json()) as RetrieveSecretResult;
  return data;
}

async function parseErrorBody(response: Response): Promise<unknown> {
  const raw = await response.text().catch(() => null);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function errorMessage(body: unknown, status: number): string {
  const fromServer = extractServerMessage(body);
  if (fromServer) return fromServer;
  return `Vaulted API returned ${status}`;
}

function extractServerMessage(body: unknown): string | null {
  if (typeof body === "string") {
    const trimmed = body.trim();
    return trimmed.length > 0 && trimmed.length <= 500 ? trimmed : null;
  }
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    for (const key of ["error", "message", "detail"]) {
      const value = obj[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
  }
  return null;
}
