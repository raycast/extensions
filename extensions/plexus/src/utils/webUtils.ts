export async function getFavicon(url: string): Promise<string | undefined> {
  try {
    // Try the most common favicon path first
    const faviconUrl = `${url}/favicon.ico`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(faviconUrl, {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return faviconUrl;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export async function getPageTitle(url: string): Promise<string | undefined> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return undefined;

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
    }

    return undefined;
  } catch {
    return undefined;
  }
}
