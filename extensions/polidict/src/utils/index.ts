import { ApiError, BadRequestError } from "../api/rest-client";

export { playSpeech } from "./speech";

export const SUPPORT_EMAIL = "support@polidict.com";

function hashString(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }

    const normalizedPayload = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const decodedPayload = Buffer.from(normalizedPayload, "base64").toString("utf8");
    return JSON.parse(decodedPayload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getAuthIdentityFromToken(token: string | null): string {
  if (!token) {
    return "anonymous";
  }

  const payload = parseJwtPayload(token);
  const subject = payload?.sub;
  if (typeof subject === "string" && subject.length > 0) {
    return `sub:${subject}`;
  }

  return `token-${hashString(token)}`;
}

export function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function formatDefinitionText(
  def: { definition?: string; translation?: string } | undefined,
  fallback = "—",
): string {
  if (!def) return fallback;
  return def.translation || def.definition || fallback;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export interface UserError {
  title: string;
  description: string;
}

const ERROR_CODE_MESSAGES: Record<string, UserError> = {
  GROUP_ALREADY_EXISTS: {
    title: "Group already exists",
    description: "A group with this name already exists.",
  },
  LEARNING_ITEM_ALREADY_EXISTS: {
    title: "Already exists",
    description: "A learning item with this text already exists.",
  },
  MAX_NUMBER_OF_LEARNING_ITEMS: {
    title: "Limit reached",
    description: "You have reached the maximum number of learning items. Upgrade to Polidict Plus for unlimited items.",
  },
  MAX_NUMBER_OF_GROUPS: {
    title: "Limit reached",
    description: "You have reached the maximum number of groups. Upgrade to Polidict Plus for unlimited groups.",
  },
};

export function formatRaycastError(error: unknown): UserError {
  if (error instanceof BadRequestError && error.errorDetails?.errorCode) {
    const mapped = ERROR_CODE_MESSAGES[error.errorDetails.errorCode];
    if (mapped) {
      return mapped;
    }
  }

  if (error instanceof TypeError) {
    return {
      title: "Connection error",
      description: "Could not connect to the server. Please check your internet connection and try again.",
    };
  }

  if (error instanceof ApiError && error.status === 429) {
    return {
      title: "Too many requests",
      description: "Please try again later.",
    };
  }

  if (error instanceof ApiError && error.status === 400) {
    return {
      title: "Bad request",
      description: error.body || "The server rejected the request.",
    };
  }

  if (error instanceof ApiError && error.status >= 500) {
    return {
      title: "Internal error",
      description: `Something went wrong on our end. Please try again later or contact ${SUPPORT_EMAIL} if the problem persists.`,
    };
  }

  return {
    title: "Something went wrong",
    description: `An unexpected error occurred. Please try again or contact ${SUPPORT_EMAIL} if the problem persists.`,
  };
}
