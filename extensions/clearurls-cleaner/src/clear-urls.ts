import { URL } from "url";
import { ClearUrlsData, Provider } from "./types";
import { safeExec, safeTest } from "./safe-regex";

export interface CleanUrlOptions {
  removeReferralMarketing?: boolean;
}

export async function cleanUrl(
  url: string,
  rules: ClearUrlsData,
  options: CleanUrlOptions = {},
): Promise<string> {
  let currentUrl = url;

  for (let i = 0; i < 5; i++) {
    const urlObj = new URL(currentUrl);
    let changed = false;

    for (const [, provider] of Object.entries(rules.providers)) {
      if (!(await matchesProvider(currentUrl, provider))) continue;

      if (provider.completeProvider) {
        return currentUrl;
      }

      for (const [key] of urlObj.searchParams) {
        if (await shouldRemoveParam(key, provider, options)) {
          urlObj.searchParams.delete(key);
          changed = true;
        }
      }

      if (provider.redirections) {
        for (const redir of provider.redirections) {
          const match = await safeExec(redir, "", currentUrl);
          if (match && match[1]) {
            try {
              currentUrl = decodeURIComponent(match[1]);
              changed = true;
            } catch {
              // ignore invalid redirect URL
            }
          }
        }
      }

      if (changed) {
        currentUrl = urlObj.toString();
      }
    }

    if (!changed) break;
  }

  return currentUrl;
}

async function matchesProvider(
  url: string,
  provider: Provider,
): Promise<boolean> {
  return safeTest(provider.urlPattern, "", url);
}

async function shouldRemoveParam(
  key: string,
  provider: Provider,
  options: CleanUrlOptions,
): Promise<boolean> {
  for (const rule of provider.rules || []) {
    if (await safeTest(rule, "", key)) return true;
  }

  if (options.removeReferralMarketing && provider.referralMarketing) {
    for (const rule of provider.referralMarketing) {
      if (await safeTest(rule, "", key)) return true;
    }
  }

  return false;
}
