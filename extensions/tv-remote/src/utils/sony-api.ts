export interface SonySystemInfo {
  product: string;
  model: string;
  generation: string;
  name: string;
}

export interface PictureQualitySetting {
  value: string;
  target: string;
}

interface SonyApiResponse<T> {
  result: T[];
  id: number;
}

const DEFAULT_TIMEOUT_MS = 2000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getSystemInfo(ip: string, timeoutMs?: number): Promise<SonySystemInfo | null> {
  try {
    const response = await fetchWithTimeout(
      `http://${ip}/sony/system`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "getSystemInformation",
          id: 1,
          params: [],
          version: "1.0",
        }),
      },
      timeoutMs,
    );

    const data = (await response.json()) as SonyApiResponse<SonySystemInfo>;
    if (data.result?.[0]?.product?.includes("BRAVIA")) {
      return data.result[0];
    }
    return null;
  } catch {
    return null;
  }
}

export async function getPictureQualitySettings(ip: string, target: string): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(`http://${ip}/sony/video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "getPictureQualitySettings",
        id: 1,
        params: [{ target }],
        version: "1.0",
      }),
    });

    const data = (await response.json()) as SonyApiResponse<{ currentValue: string }[]>;
    return data.result?.[0]?.[0]?.currentValue ?? null;
  } catch {
    return null;
  }
}

export async function setPictureQualitySettings(ip: string, settings: PictureQualitySetting[]): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`http://${ip}/sony/video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "setPictureQualitySettings",
        id: 1,
        params: [{ settings }],
        version: "1.0",
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
