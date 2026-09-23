const DOWNLOAD_COUNT_LABEL = "Total downloads";
/** Anchored on the heading: a bare `title="\d+"` could match an unrelated attribute. */
const DOWNLOAD_COUNT_PATTERN = /<h3[^>]*title="([\d,]+)"/;
const SEARCH_WINDOW = 500;
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * The Packages API doesn't expose download counts, so the number is read out of the
 * package's web page. Every failure resolves to `undefined` — callers leave it out.
 */
export async function fetchPackageDownloadCount(htmlUrl: string): Promise<number | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(htmlUrl, { headers: { accept: "text/html" }, signal: controller.signal });

    if (!response.ok) {
      return undefined;
    }

    const html = await response.text();
    const labelIndex = html.indexOf(DOWNLOAD_COUNT_LABEL);

    if (labelIndex === -1) {
      return undefined;
    }

    const match = DOWNLOAD_COUNT_PATTERN.exec(html.slice(labelIndex, labelIndex + SEARCH_WINDOW));

    if (!match) {
      return undefined;
    }

    const count = Number(match[1].replace(/,/g, ""));

    return Number.isFinite(count) ? count : undefined;
  } catch (error) {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}
