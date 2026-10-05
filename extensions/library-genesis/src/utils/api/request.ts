import { load } from "cheerio";

export const LIBGEN_USER_AGENT = "Raycast-Library-Genesis";

export const fetchLibgenPage = async (url: string, signal?: AbortSignal, timeoutMs = 15000): Promise<string> => {
  const controller = new AbortController();
  const abort = () => controller.abort();
  let timedOut = false;
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": LIBGEN_USER_AGENT },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`${new URL(url).hostname} returned HTTP ${response.status}. Try another mirror.`);
    }
    return await response.text();
  } catch (error) {
    if (timedOut && !signal?.aborted) {
      throw new Error(`${new URL(url).hostname} timed out. Try another mirror.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
};

export const fetchLibgenSearchPage = async (url: string, signal?: AbortSignal, timeoutMs?: number): Promise<string> => {
  const content = await fetchLibgenPage(url, signal, timeoutMs);
  const $ = load(content);
  const hasResultsTable = $("table#tablelibgen").length > 0;
  const hasEmptyResults =
    $("form#formlibgen input[name='req']").length > 0 &&
    $(".nav-tabs .nav-link.active .badge").first().text().trim() === "0";

  if (!hasResultsTable && !hasEmptyResults) {
    throw new Error(`${new URL(url).hostname} did not return a Library Genesis search page. Try another mirror.`);
  }
  return content;
};

export const getMirrorTestUrl = (baseUrl: string): string => {
  const url = new URL("index.php", `${baseUrl.replace(/\/+$/, "")}/`);
  url.search = new URLSearchParams({
    req: "Alice in Wonderland",
    res: "1",
    covers: "on",
    filesuns: "all",
    "columns[]": "t",
    "objects[]": "f",
    "topics[]": "l",
  }).toString();
  return url.toString();
};
