import { getPreferenceValues } from "@raycast/api";

const DEFAULT_SITE_URL = "https://idonthavespotify.sjdonado.com";

const normalizeInstanceUrl = (value: string): string | null => {
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      return null;
    }
    return url.toString().replace(/\/+$/, "");
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

  const siteUrl = normalizeInstanceUrl(trimmedInstanceUrl);
  if (!siteUrl) throw new Error("Enter a valid HTTP or HTTPS Self-Hosted Instance URL in Extension Preferences.");
  return siteUrl;
};

export const getApiUrl = (): string => `${getSiteUrl()}/api/search?v=1`;
