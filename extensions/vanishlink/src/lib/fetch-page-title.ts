import parse from "node-html-parser";

export async function fetchPageTitle(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.debug(`HTTP ${response.status} for ${url}`);
      return url;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("text/html")) {
      console.debug(`Non-HTML content type: ${contentType} for ${url}`);
      return url;
    }

    const html = await response.text();
    const doc = parse(html);
    const title = doc.querySelector("title")?.text?.trim();
    console.debug(`title:${title}`);

    if (title && title.length > 0) {
      return title;
    }

    return url;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      console.debug(`Fetch timeout for ${url}`);
    } else {
      console.debug(`Fetch error for ${url}:`, error);
    }
    return url;
  }
}
