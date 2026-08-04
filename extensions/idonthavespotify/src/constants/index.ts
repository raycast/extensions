import { getPreferenceValues } from "@raycast/api";

const DEFAULT_SITE_URL = "https://idonthavespotify.sjdonado.com";

const normalizeInstanceUrl = (value: string): string | null => {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    return new URL(withProtocol).toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
};

export const getSiteUrl = (): string => {
  const { instanceUrl } = getPreferenceValues<Preferences>();
  const trimmedInstanceUrl = instanceUrl?.trim();

  if (!trimmedInstanceUrl) {
    return DEFAULT_SITE_URL;
  }

  return normalizeInstanceUrl(trimmedInstanceUrl) ?? DEFAULT_SITE_URL;
};

export const getApiUrl = (): string => `${getSiteUrl()}/api/search?v=1`;

export const LINK_REGEX = /^https?:\/\/[\w.-]+(?:\.[\w.-]+)+.*$/;
