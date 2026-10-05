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

async function fetchWithTimeout(
  url: string,
  timeoutMs = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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
  }
}

export async function fetchCurrentIP(): Promise<string> {
  // First attempt: HTTPS all-in-one geolocation from ipwho.is
  try {
    const response = await fetchWithTimeout('https://ipwho.is/');
    if (response.ok) {
      const data = (await response.json()) as IpWhoIsResponse;
      if (data.success && data.ip) {
        const locationParts = [data.city, data.country].filter(Boolean);
        const locationStr =
          locationParts.length > 0
            ? locationParts.join(', ')
            : 'Location unavailable';
        return `${data.ip} - ${locationStr}`;
      }
    }
  } catch (error) {
    console.error('Error fetching geolocation from ipwho.is:', error);
  }

  // Fallback 1: ipify for IP only
  try {
    const response = await fetchWithTimeout(
      'https://api.ipify.org?format=json'
    );
    if (response.ok) {
      const data = (await response.json()) as IpifyResponse;
      if (data.ip) {
        return `${data.ip} - Location unavailable`;
      }
    }
  } catch (error) {
    console.error('Error fetching fallback IP from ipify:', error);
  }

  // Fallback 2: text endpoint
  try {
    const response = await fetchWithTimeout(
      'https://api.ipify.org?format=text'
    );
    if (response.ok) {
      const text = (await response.text()).trim();
      if (text) {
        return `${text} - Location unavailable`;
      }
    }
  } catch (error) {
    console.error('Text fallback IP lookup failed:', error);
  }

  return 'IP information unavailable';
}
