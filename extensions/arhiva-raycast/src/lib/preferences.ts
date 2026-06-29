import "dotenv/config";
import { environment, getPreferenceValues } from "@raycast/api";

const baseUrlHostnamePattern = /^[a-z0-9.-]+$/i;
const edgeQuotePattern = /^[`'"]+|[`'"]+$/g;

type ArhivaPreferences = {
  readonly webAppUrl?: string;
  readonly convexUrl?: string;
  readonly convexSiteUrl?: string;
};

const developmentUrls: Readonly<Record<string, string>> = {
  VITE_WEB_APP_URL: "http://localhost:3001",
  VITE_CONVEX_URL: "http://127.0.0.1:3210",
  VITE_CONVEX_SITE_URL: "http://127.0.0.1:3211",
};

const normalizePreferenceUrl = (value: string) => value.trim().replace(edgeQuotePattern, "");

const getPreferences = () => getPreferenceValues<ArhivaPreferences>();

const getConfiguredUrl = (
  preferenceValue: string | undefined,
  preferenceName: string,
  envKey: string,
) => {
  const envValue = process.env[envKey];
  const developmentValue = environment.isDevelopment ? developmentUrls[envKey] : undefined;
  const value = envValue?.trim().length ? envValue : (developmentValue ?? preferenceValue);
  if (value == null || value.trim().length === 0) {
    throw new Error(`${preferenceName} must be set in Raycast preferences or ${envKey}.`);
  }
  return value;
};

const requireHttpUrl = (
  value: string,
  name: string,
  options?: {
    readonly baseUrlOnly?: boolean;
  },
) => {
  try {
    const url = new URL(normalizePreferenceUrl(value));
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`${name} must be an http(s) URL.`);
    }
    if (!baseUrlHostnamePattern.test(url.hostname)) {
      throw new Error(`${name} must have a valid hostname.`);
    }
    if (
      options?.baseUrlOnly === true &&
      (url.pathname !== "/" || url.search.length > 0 || url.hash.length > 0)
    ) {
      throw new Error(`${name} must not include a path, query, or hash.`);
    }
    return url.toString().replace(/\/+$/g, "");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(`${name} must`)) {
      throw error;
    }
    throw new Error(`${name} must be a valid URL.`);
  }
};

export function getWebAppBaseUrl() {
  return requireHttpUrl(
    getConfiguredUrl(getPreferences().webAppUrl, "Web App URL", "VITE_WEB_APP_URL"),
    "Web App URL",
  );
}

export function getConvexUrl() {
  return requireHttpUrl(
    getConfiguredUrl(getPreferences().convexUrl, "Convex URL", "VITE_CONVEX_URL"),
    "Convex URL",
    {
      baseUrlOnly: true,
    },
  );
}

export function getConvexSiteUrl() {
  return requireHttpUrl(
    getConfiguredUrl(getPreferences().convexSiteUrl, "Convex Site URL", "VITE_CONVEX_SITE_URL"),
    "Convex Site URL",
    {
      baseUrlOnly: true,
    },
  );
}

export function getWebAppUrl(path = "/app") {
  return new URL(path, `${getWebAppBaseUrl()}/`).toString();
}

export function getAuthUrl(path: string) {
  return new URL(path, `${getConvexSiteUrl()}/`).toString();
}

export function getTrustedAuthOrigin() {
  return new URL(getWebAppBaseUrl()).origin;
}
