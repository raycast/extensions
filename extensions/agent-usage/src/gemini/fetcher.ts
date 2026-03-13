import { GeminiUsage, GeminiError, GeminiModelQuota } from "./types";
import { resolveGeminiAuthType, resolveGeminiOAuthClientCredentialsFromLocal } from "./auth";
import { createSimpleHook } from "../agents/hooks";
import { formatResetTime } from "../agents/format";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const SETTINGS_PATH = path.join(os.homedir(), ".gemini", "settings.json");
const OAUTH_CREDS_PATH = path.join(os.homedir(), ".gemini", "oauth_creds.json");

const QUOTA_API = "https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota";
const LOAD_CODE_ASSIST_API = "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist";
const TOKEN_REFRESH_API = "https://oauth2.googleapis.com/token";
const PROJECTS_API = "https://cloudresourcemanager.googleapis.com/v1/projects";

const REQUEST_TIMEOUT = 15000;

interface OAuthCreds {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  expiry_date: number;
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Ignore write errors
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Convert base64url to base64
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // Add padding if needed
    const padding = base64.length % 4;
    if (padding) {
      base64 += "=".repeat(4 - padding);
    }

    const payload = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

async function refreshAccessToken(creds: OAuthCreds): Promise<{ accessToken: string; expiryDate: number } | null> {
  if (!creds.refresh_token) return null;

  const clientCreds = resolveGeminiOAuthClientCredentialsFromLocal();
  if (!clientCreds) return null;

  try {
    const body = new URLSearchParams({
      client_id: clientCreds.clientId,
      client_secret: clientCreds.clientSecret,
      refresh_token: creds.refresh_token,
      grant_type: "refresh_token",
    });

    const response = await fetch(TOKEN_REFRESH_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { access_token: string; expires_in: number };
    const expiryDate = Date.now() + data.expires_in * 1000;

    return { accessToken: data.access_token, expiryDate };
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function fetchTier(accessToken: string): Promise<{ tier: GeminiUsage["tier"]; projectId?: string }> {
  try {
    const response = await fetchWithTimeout(LOAD_CODE_ASSIST_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ metadata: { ideType: "GEMINI_CLI", pluginType: "GEMINI" } }),
    });

    if (!response.ok) {
      return { tier: "Unknown" };
    }

    const data = (await response.json()) as Record<string, unknown>;

    const currentTier = data.currentTier as { id?: string } | undefined;
    const tierStr = currentTier?.id || "";
    const projectId = data.cloudaicompanionProject as string | undefined;

    let tier: GeminiUsage["tier"] = "Unknown";
    if (tierStr === "standard-tier" || tierStr === "g1-pro-tier") {
      tier = "Paid";
    } else if (tierStr === "free-tier") {
      tier = "Free";
    } else if (tierStr === "legacy-tier") {
      tier = "Legacy";
    }

    return { tier, projectId };
  } catch {
    return { tier: "Unknown" };
  }
}

async function fetchProjectId(accessToken: string): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(PROJECTS_API, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      projects?: Array<{ projectId: string; labels?: Record<string, string> }>;
    };
    const projects = data.projects || [];

    // Look for gen-lang-client* or generative-language label
    for (const p of projects) {
      if (p.projectId.startsWith("gen-lang-client")) return p.projectId;
      if (p.labels?.["generative-language"]) return p.projectId;
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchQuota(
  accessToken: string,
  projectId?: string,
): Promise<{ proModel: GeminiModelQuota | null; flashModel: GeminiModelQuota | null }> {
  try {
    const body = projectId ? { project: projectId } : {};

    const response = await fetchWithTimeout(QUOTA_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { proModel: null, flashModel: null };
    }

    const data = (await response.json()) as Record<string, unknown>;

    const buckets =
      (data.buckets as Array<{
        remainingFraction: number;
        resetTime: string;
        modelId: string;
      }>) || [];

    // Extract version number from model ID (e.g., "gemini-2.5-pro" -> 2.5, "gemini-3-flash-preview" -> 3)
    function getModelVersion(modelId: string): number {
      const match = modelId.match(/gemini-(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : 0;
    }

    // Find highest version Pro and Flash models
    let proModel: GeminiModelQuota | null = null;
    let proVersion = 0;
    let flashModel: GeminiModelQuota | null = null;
    let flashVersion = 0;

    for (const bucket of buckets) {
      const modelId = bucket.modelId?.toLowerCase() || "";
      const version = getModelVersion(modelId);
      const quota: GeminiModelQuota = {
        percentLeft: Math.round(bucket.remainingFraction * 100),
        resetsIn: formatResetTime(bucket.resetTime),
        modelId: bucket.modelId,
      };

      if (modelId.includes("pro") && !modelId.includes("flash")) {
        if (version > proVersion) {
          proModel = quota;
          proVersion = version;
        }
      } else if (modelId.includes("flash")) {
        if (version > flashVersion) {
          flashModel = quota;
          flashVersion = version;
        }
      }
    }

    return { proModel, flashModel };
  } catch {
    return { proModel: null, flashModel: null };
  }
}

async function fetchGeminiUsage(): Promise<{ usage: GeminiUsage | null; error: GeminiError | null }> {
  // Check auth type
  const settings = readJsonFile<{ authType?: string; security?: { auth?: { selectedType?: string } } }>(SETTINGS_PATH);
  const authType = resolveGeminiAuthType(settings);

  if (authType === "api-key" || authType === "vertex-ai") {
    return {
      usage: null,
      error: {
        type: "unsupported_auth",
        message: `Auth type "${authType}" is not supported. Please use OAuth authentication.`,
      },
    };
  }

  // Read OAuth credentials
  const creds = readJsonFile<OAuthCreds>(OAUTH_CREDS_PATH);
  if (!creds || !creds.access_token) {
    return {
      usage: null,
      error: {
        type: "not_configured",
        message: "Gemini CLI not configured. Run 'gemini' to authenticate.",
      },
    };
  }

  // Check if token is expired and refresh if needed
  let accessToken = creds.access_token;
  const now = Date.now();
  if (creds.expiry_date && creds.expiry_date < now) {
    const refreshed = await refreshAccessToken(creds);
    if (refreshed) {
      accessToken = refreshed.accessToken;
      const updatedCreds = { ...creds, access_token: refreshed.accessToken, expiry_date: refreshed.expiryDate };
      writeJsonFile(OAUTH_CREDS_PATH, updatedCreds);
    } else {
      return {
        usage: null,
        error: {
          type: "unauthorized",
          message: "OAuth token expired and refresh failed. Run 'gemini' to re-authenticate.",
        },
      };
    }
  }

  try {
    // Extract email from id_token
    const jwtPayload = decodeJwtPayload(creds.id_token);
    const email = (jwtPayload?.email as string) || "Unknown";

    // Fetch tier and project ID
    const { tier, projectId: tierProjectId } = await fetchTier(accessToken);

    // Get project ID (from tier response or fallback)
    let projectId = tierProjectId;
    if (!projectId) {
      projectId = (await fetchProjectId(accessToken)) || undefined;
    }

    // Fetch quota
    const { proModel, flashModel } = await fetchQuota(accessToken, projectId);

    return {
      usage: { email, tier, proModel, flashModel },
      error: null,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        usage: null,
        error: {
          type: "network_error",
          message: "Request timeout. Please check your network connection.",
        },
      };
    }

    return {
      usage: null,
      error: {
        type: "network_error",
        message: error instanceof Error ? error.message : "Network request failed",
      },
    };
  }
}

export const useGeminiUsage = createSimpleHook<GeminiUsage, GeminiError>({ fetcher: fetchGeminiUsage });
