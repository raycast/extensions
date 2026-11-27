import type { Envelope } from "./types.js";
import type { Preferences } from "./types.js";
import type { Workspace } from "./types.js";

const API_BASE_URL = "https://enclave.subnoto.com";

export async function getSubnotoClient(preferences: Preferences) {
  const { SubnotoClient } = await import("@subnoto/api-client");
  return new SubnotoClient({
    apiBaseUrl: API_BASE_URL,
    accessKey: preferences.apiAccessKey,
    secretKey: preferences.apiSecretKey,
  });
}

function describeError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let i = 0; i < 5 && current; i++) {
    if (current instanceof Error) {
      if (current.message) {
        parts.push(current.message);
      }
      current = current.cause;
    } else {
      parts.push(String(current));
      break;
    }
  }
  return parts.join(" — ");
}

async function throwApiError(fallback: string, error: unknown): Promise<never> {
  const { getErrorMessage } = await import("@subnoto/api-client");
  throw new Error(getErrorMessage(error) || describeError(error) || fallback);
}

export async function listWorkspaces(preferences: Preferences): Promise<Workspace[]> {
  const client = await getSubnotoClient(preferences);
  let data;
  let error;
  try {
    ({ data, error } = await client.POST("/public/workspace/list", { body: {} }));
  } catch (err) {
    throw new Error(describeError(err) || "Failed to load workspaces.");
  }

  if (error) {
    await throwApiError("Failed to load workspaces. Please check your API credentials.", error);
  }

  if (!data?.workspaces?.length) {
    return [];
  }

  return data.workspaces;
}

const ENVELOPES_PAGE_SIZE = 50;

export async function listEnvelopes(
  preferences: Preferences,
  workspaceUuid: string | undefined,
  page = 1
): Promise<Envelope[]> {
  const client = await getSubnotoClient(preferences);
  const body = workspaceUuid === undefined || workspaceUuid === "" ? { page } : { workspaceUuid, page };
  let data;
  let error;
  try {
    ({ data, error } = await client.POST("/public/envelope/list", {
      body,
    }));
  } catch (err) {
    throw new Error(describeError(err) || "Failed to load envelopes.");
  }

  if (error) {
    await throwApiError("Failed to load envelopes. Please check your API credentials.", error);
  }

  if (!data?.envelopes?.length) {
    return [];
  }

  return data.envelopes;
}

export { ENVELOPES_PAGE_SIZE };
