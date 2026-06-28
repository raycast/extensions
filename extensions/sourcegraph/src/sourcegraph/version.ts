import { getProxiedFetch } from "./gql/fetchProxy";

async function getInstanceVersion(instance: string, prefs: Preferences): Promise<string> {
  // Normalize to avoid `//__version` if callers ever pass a trailing slash
  const baseUrl = instance.replace(/\/$/, "");
  const fetchFn = getProxiedFetch(prefs.customInstanceProxy);

  const response = await fetchFn(`${baseUrl}/__version`);
  if (!response.ok) {
    throw new Error(`Request to ${baseUrl}/__version failed with status ${response.status} ${response.statusText}`);
  }

  return (await response.text()).trim();
}

export async function checkHasBuiltinOAuth(instance: string, prefs: Preferences): Promise<boolean> {
  const versionText = await getInstanceVersion(instance, prefs);

  const AFTER_VERSION = { major: 6, minor: 10, patch: 0 };
  const semverRegex = /^v?(\d+)\.(\d+)\.(\d+)/;
  const match = versionText.match(semverRegex);

  // 2. If version is NOT semver, assume client is available
  if (!match) {
    return true;
  }

  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  const patch = parseInt(match[3], 10);

  // Extra safety in case something weird sneaks through (e.g. huge strings, overflow)
  if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) {
    return true; // treat as non-semver per requirement
  }

  // 3. Only allow > 6.10.0
  if (major !== AFTER_VERSION.major) {
    return major > AFTER_VERSION.major;
  }
  if (minor !== AFTER_VERSION.minor) {
    return minor > AFTER_VERSION.minor;
  }
  return patch > AFTER_VERSION.patch;
}
