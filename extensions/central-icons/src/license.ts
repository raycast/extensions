import { LocalStorage } from "@raycast/api";

export const FREE_COPY_LIMIT = 10;

const API_BASE = "https://centralicons.com";
const VALIDATION_CACHE_KEY = "license-validation";
const VALIDATION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Reported to /license/check so Raycast seats show up in `track_license_usage`
 * with a real version instead of the server's "< 0.0.60" legacy fallback.
 * Bump alongside each CHANGELOG.md entry.
 */
const EXTENSION_VERSION = "1.0.0";

interface ValidationCache {
  licenseKey: string;
  valid: boolean;
  checkedAt: number;
}

async function readValidationCache(): Promise<ValidationCache | undefined> {
  try {
    const raw = await LocalStorage.getItem<string>(VALIDATION_CACHE_KEY);
    return raw ? (JSON.parse(raw) as ValidationCache) : undefined;
  } catch {
    return undefined;
  }
}

type CheckResult = { data?: { isValid?: boolean } };

/**
 * Validates a license key against the centralicons.com license check API.
 * Results are cached for 24h; on network failure the last known result is
 * kept (fails open in the customer's favor, like the API itself).
 *
 * This is the extension's only usage reporting: the server records one
 * `track_license_usage` row per license per 24h, tagged `package: "raycast"`,
 * on the cache miss that triggers the daily refresh. No per-export events and
 * no icon names are sent — see README "Privacy".
 */
export async function checkLicense(licenseKey: string): Promise<boolean> {
  if (!licenseKey.trim()) return false;

  const cached = await readValidationCache();
  if (cached && cached.licenseKey === licenseKey && Date.now() - cached.checkedAt < VALIDATION_TTL_MS) {
    return cached.valid;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${API_BASE}/license/check`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${licenseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        package: "raycast",
        version: EXTENSION_VERSION,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = (await response.json()) as CheckResult;
    const valid = json.data?.isValid === true;
    if (valid) {
      await LocalStorage.setItem(
        VALIDATION_CACHE_KEY,
        JSON.stringify({
          licenseKey,
          valid,
          checkedAt: Date.now(),
        } satisfies ValidationCache),
      );
    } else {
      // Only successes are cached, mirroring the server, which throws
      // LicenseCheckNotCacheable so a failure never lands in its 24h cache. A key
      // that fails once — bought but not yet activated, or a transient outage —
      // has to be retryable on the next launch instead of being pinned to
      // "invalid" for a day with no way back.
      await LocalStorage.removeItem(VALIDATION_CACHE_KEY);
    }
    return valid;
  } catch {
    return cached?.licenseKey === licenseKey ? cached.valid : false;
  } finally {
    clearTimeout(timeout);
  }
}
