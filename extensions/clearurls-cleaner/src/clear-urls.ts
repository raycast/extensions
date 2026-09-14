import { ClearUrlsData, Provider } from "./types";

export interface CleanOptions {
  removeReferralMarketing?: boolean;
}

export function cleanUrl(
  url: string,
  rules: ClearUrlsData,
  options: CleanOptions = {},
): string {
  let currentUrl = url.trim();
  if (!currentUrl) return "";

  const providers = Object.values(rules.providers);
  const maxIterations = 5;

  for (let i = 0; i < maxIterations; i++) {
    const nextUrl = applyProvidersOnce(currentUrl, providers, options);
    if (nextUrl === currentUrl) break;
    currentUrl = nextUrl;
  }

  return currentUrl;
}

function applyProvidersOnce(
  url: string,
  providers: Provider[],
  options: CleanOptions,
): string {
  let currentUrl = url;

  for (const provider of providers) {
    try {
      const pattern = new RegExp(provider.urlPattern, "i");
      if (!pattern.test(currentUrl)) continue;
    } catch {
      continue;
    }

    if (provider.exceptions.some((e) => matchesRegex(currentUrl, e))) continue;
    if (provider.completeProvider) continue;

    const redirectUrl = extractRedirect(currentUrl, provider);
    if (redirectUrl && redirectUrl !== currentUrl) {
      return redirectUrl;
    }

    currentUrl = cleanParams(currentUrl, provider, options);
    currentUrl = applyRawRules(currentUrl, provider);
  }

  return currentUrl;
}

function matchesRegex(url: string, pattern: string): boolean {
  try {
    return new RegExp(pattern, "i").test(url);
  } catch {
    return false;
  }
}

function extractRedirect(url: string, provider: Provider): string | null {
  for (const redir of provider.redirections) {
    try {
      const re = new RegExp(redir, "i");
      const match = re.exec(url);
      if (match && match[1]) {
        const target = decodeURIComponent(match[1]);
        if (isValidHttpUrl(target)) return target;
      }
    } catch {
      // ignore decoding error
    }
  }
  return null;
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function cleanParams(
  url: string,
  provider: Provider,
  options: CleanOptions,
): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const rules = [...provider.rules];
  if (options.removeReferralMarketing !== false) {
    rules.push(...provider.referralMarketing);
  }

  if (rules.length === 0) return url;

  const keysToRemove: string[] = [];
  for (const key of parsed.searchParams.keys()) {
    const decodedKey = decodeURIComponent(key);
    for (const rule of rules) {
      if (matchesKey(decodedKey, rule)) {
        keysToRemove.push(key);
        break;
      }
    }
  }

  for (const key of keysToRemove) {
    parsed.searchParams.delete(key);
  }

  return parsed.toString();
}

function matchesKey(key: string, rule: string): boolean {
  try {
    const re = new RegExp(`^(?:${rule})$`, "i");
    return re.test(key);
  } catch {
    return false;
  }
}

function applyRawRules(url: string, provider: Provider): string {
  let result = url;
  for (const raw of provider.rawRules) {
    try {
      const re = new RegExp(raw, "gi");
      result = result.replace(re, "");
    } catch {
      // ignore invalid redirect URL
    }
  }
  return result;
}
