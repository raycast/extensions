export async function fetchFavicon(url: string): Promise<string | null> {
  try {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;

    // Try Google's favicon service
    const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;

    try {
      const response = await fetch(googleFaviconUrl);
      if (response.ok) {
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        return `data:${blob.type};base64,${base64}`;
      }
    } catch (error) {
      console.error("Google favicon failed, trying direct fetch:", error);
    }

    // Fallback: try common locations
    const faviconUrls = [`${baseUrl}/favicon.ico`, `${baseUrl}/favicon.png`, `${baseUrl}/apple-touch-icon.png`];

    for (const faviconUrl of faviconUrls) {
      try {
        const response = await fetch(faviconUrl);
        if (response.ok) {
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          return `data:${blob.type};base64,${base64}`;
        }
      } catch {
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching favicon:", error);
    return null;
  }
}

export function getGoogleFaviconUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return "";
  }
}
