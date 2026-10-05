// src/utils/fetchCurrentIP.ts

interface IpWhoIsResponse {
  ip?: string;
  success?: boolean;
  city?: string;
  region_code?: string;
  country?: string;
  message?: string;
}

interface IpifyResponse {
  ip?: string;
}

export interface IPInfo {
  ip: string;
  location?: string;
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = 5000,
  signal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onAbort = () => {
    controller.abort();
  };

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', onAbort);
    }
  }

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Raycast-Mozilla-VPN/1.0',
      },
    });
    return response;
  } finally {
    clearTimeout(timer);
    if (signal) {
      signal.removeEventListener('abort', onAbort);
    }
  }
}

export async function fetchCurrentIPInfo(
  signal?: AbortSignal
): Promise<IPInfo | null> {
  // First attempt: HTTPS all-in-one geolocation from ipwho.is
  try {
    const response = await fetchWithTimeout('https://ipwho.is/', 5000, signal);
    if (response.ok) {
      const data = (await response.json()) as IpWhoIsResponse;
      if (data.success && data.ip) {
        const locationParts = [data.city, data.country].filter(Boolean);
        const location =
          locationParts.length > 0 ? locationParts.join(', ') : undefined;
        return { ip: data.ip, location };
      }
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    console.error('Error fetching geolocation from ipwho.is:', error);
  }

  // Fallback 1: ipify for IP only
  try {
    const response = await fetchWithTimeout(
      'https://api.ipify.org?format=json',
      5000,
      signal
    );
    if (response.ok) {
      const data = (await response.json()) as IpifyResponse;
      if (data.ip) {
        return { ip: data.ip };
      }
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    console.error('Error fetching fallback IP from ipify:', error);
  }

  // Fallback 2: text endpoint
  try {
    const response = await fetchWithTimeout(
      'https://api.ipify.org?format=text',
      5000,
      signal
    );
    if (response.ok) {
      const text = (await response.text()).trim();
      if (text) {
        return { ip: text };
      }
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    console.error('Text fallback IP lookup failed:', error);
  }

  return null;
}

export function formatIPInfo(info: IPInfo | null): string {
  if (!info) {
    return 'IP information unavailable';
  }
  if (info.location) {
    return `${info.ip} - ${info.location}`;
  }
  return `${info.ip} - Location unavailable`;
}

export async function fetchCurrentIP(signal?: AbortSignal): Promise<string> {
  const info = await fetchCurrentIPInfo(signal);
  return formatIPInfo(info);
}
