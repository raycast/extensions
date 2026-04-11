import { getPreferenceValues } from "@raycast/api";

const DEFAULT_TWENTY_BASE_URL = "https://app.twenty.com";

export interface TwentyConfig {
  token: string;
  authHeader: string;
  baseUrl: string;
  restBaseUrl: string;
  keepObjectFormOpen: boolean;
}

type RawPreferences = Pick<Preferences, "token" | "url" | "object_creation_form_behaviour">;

export const normalizeTwentyBaseUrl = (input?: string): string => {
  const trimmed = input?.trim();
  const value = trimmed ? trimmed : DEFAULT_TWENTY_BASE_URL;

  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/+$/, "");

    if (url.pathname.endsWith("/rest")) {
      url.pathname = url.pathname.slice(0, -5);
    }

    const normalized = url.toString();
    return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  } catch {
    throw new Error(
      "Invalid Twenty base URL. Enter a full URL such as https://app.twenty.com or https://twenty.example.com.",
    );
  }
};

export const buildTwentyConfig = (raw: RawPreferences): TwentyConfig => {
  const baseUrl = normalizeTwentyBaseUrl(raw.url);

  return {
    token: raw.token,
    authHeader: `Bearer ${raw.token}`,
    baseUrl,
    restBaseUrl: `${baseUrl}/rest`,
    keepObjectFormOpen: raw.object_creation_form_behaviour,
  };
};

export const getTwentyConfig = (): TwentyConfig => {
  return buildTwentyConfig(getPreferenceValues<RawPreferences>());
};
