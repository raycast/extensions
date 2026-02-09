import { ExtensionPreferences } from "./preferences";

const DEFAULT_TIMEOUT_MS = 8_000;

export function getAuthHeader(prefs: ExtensionPreferences): string | null {
  const header = prefs.tronbytAuthHeader?.trim();
  if (header) return header;
  const token = prefs.tronbytApiToken?.trim();
  if (!token) return null;
  return `Bearer ${token}`;
}

export function buildBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function getTronbytConfig(prefs: ExtensionPreferences): {
  baseUrl: string;
  deviceId: string;
} {
  const baseUrlInput = prefs.tronbytBaseUrl?.trim();
  const deviceId = prefs.tronbytDeviceId?.trim();

  if (!baseUrlInput || !deviceId) {
    throw new Error(
      "Tronbyt Base URL and Device ID are required to push updates. Configure them in the extension preferences."
    );
  }

  return { baseUrl: buildBaseUrl(baseUrlInput), deviceId };
}

export async function pushImage(
  prefs: ExtensionPreferences,
  installationId: string,
  base64Webp: string
): Promise<void> {
  const { baseUrl, deviceId } = getTronbytConfig(prefs);
  const url = `${baseUrl}/v0/devices/${deviceId}/push`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const auth = getAuthHeader(prefs);
  if (auth) headers.Authorization = auth;

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        image: base64Webp,
        installationID: installationId,
      }),
    },
    DEFAULT_TIMEOUT_MS
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Tronbyt push failed (${response.status}): ${text}`);
  }
}

export async function removeInstallation(
  prefs: ExtensionPreferences,
  installationId: string
): Promise<void> {
  const { baseUrl, deviceId } = getTronbytConfig(prefs);
  const url = `${baseUrl}/v0/devices/${deviceId}/installations/${installationId}`;
  const headers: Record<string, string> = {};
  const auth = getAuthHeader(prefs);
  if (auth) headers.Authorization = auth;

  const response = await fetchWithTimeout(
    url,
    { method: "DELETE", headers },
    DEFAULT_TIMEOUT_MS
  );
  if (!response.ok && response.status !== 404) {
    const text = await response.text().catch(() => "");
    throw new Error(`Tronbyt remove failed (${response.status}): ${text}`);
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
