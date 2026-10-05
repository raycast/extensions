export const DEFAULT_INSTANCE_URL = "https://demo.usememos.com";

const HAS_SCHEME = /^[a-z][a-z\d+.-]*:\/\//i;
const WEB_PROTOCOLS = ["http:", "https:"];

const parseUrl = (candidate: string): URL | null => {
  try {
    return new URL(candidate);
  } catch {
    return null;
  }
};

export const normalizeInstanceUrl = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed === "") return DEFAULT_INSTANCE_URL;

  const url = parseUrl(HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`);
  if (url == null || !WEB_PROTOCOLS.includes(url.protocol)) {
    throw new Error(`"${trimmed}" is not a valid instance URL. Use a full address like https://memos.example.com`);
  }

  return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
};

export const displayInstanceUrl = (raw: string): string => {
  try {
    return normalizeInstanceUrl(raw);
  } catch {
    return raw.trim() || DEFAULT_INSTANCE_URL;
  }
};

export const accessTokenSettingsUrl = (instanceUrl: string) => `${instanceUrl}/setting#access-token`;

export const memoUrl = (instanceUrl: string, memoName: string) => `${instanceUrl}/${memoName}`;
