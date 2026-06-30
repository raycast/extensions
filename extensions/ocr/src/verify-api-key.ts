import { createHash } from "node:crypto";

import { LocalStorage } from "@raycast/api";

import { getOpenRouterApiKey } from "./preferences";

export const OPENROUTER_AUTH_KEY_URL = "https://openrouter.ai/api/v1/auth/key";

const VALIDATED_API_KEY_FINGERPRINT_KEY = "openRouterApiKeyFingerprint";

export type ApiKeyValidationResult =
  | { status: "valid"; skipped: boolean }
  | { status: "missing" }
  | { status: "invalid"; message: string }
  | { status: "network"; message: string };

export function fingerprintApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey.trim()).digest("hex");
}

export async function validateOpenRouterApiKeyIfChanged(
  apiKey: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<ApiKeyValidationResult> {
  const normalizedApiKey = apiKey.trim();

  if (!normalizedApiKey) {
    return { status: "missing" };
  }

  const fingerprint = fingerprintApiKey(normalizedApiKey);
  const storedFingerprint = await LocalStorage.getItem<string>(VALIDATED_API_KEY_FINGERPRINT_KEY);

  if (storedFingerprint === fingerprint) {
    return { status: "valid", skipped: true };
  }

  try {
    const response = await fetchImplementation(OPENROUTER_AUTH_KEY_URL, {
      headers: {
        Authorization: `Bearer ${normalizedApiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Extract Screenshot Text",
      },
    });

    if (response.status === 401 || response.status === 403) {
      await LocalStorage.removeItem(VALIDATED_API_KEY_FINGERPRINT_KEY);
      return {
        status: "invalid",
        message: "OpenRouter didn't accept your API key. Check it in extension preferences.",
      };
    }

    if (!response.ok) {
      return {
        status: "network",
        message: "Couldn't verify your OpenRouter API key. Try again.",
      };
    }

    await LocalStorage.setItem(VALIDATED_API_KEY_FINGERPRINT_KEY, fingerprint);
    return { status: "valid", skipped: false };
  } catch {
    return {
      status: "network",
      message: "Couldn't verify your OpenRouter API key. Check your connection and try again.",
    };
  }
}

export async function ensureOpenRouterApiKeyIsValid(
  fetchImplementation?: typeof fetch,
): Promise<ApiKeyValidationResult> {
  return validateOpenRouterApiKeyIfChanged(getOpenRouterApiKey(), fetchImplementation);
}
