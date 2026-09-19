import { get as httpsGet } from "node:https";

export async function fetchJson<T>(
  url: string,
  signal: AbortSignal,
  headers: Record<string, string> = {},
): Promise<T> {
  try {
    const response = await fetchResponse(url, signal, headers);
    return (await response.json()) as T;
  } catch (error) {
    if (!isFetchTransportError(error) || signal.aborted) throw error;
    return JSON.parse(await fetchTextWithNodeHttps(url, signal, headers)) as T;
  }
}

export async function fetchText(
  url: string,
  signal: AbortSignal,
  headers: Record<string, string> = {},
): Promise<string> {
  try {
    const response = await fetchResponse(url, signal, headers);
    return response.text();
  } catch (error) {
    if (!isFetchTransportError(error) || signal.aborted) throw error;
    return fetchTextWithNodeHttps(url, signal, headers);
  }
}

export async function fetchJsonViaHttps<T>(
  url: string,
  signal: AbortSignal,
  headers: Record<string, string> = {},
): Promise<T> {
  return JSON.parse(await fetchTextWithNodeHttps(url, signal, headers)) as T;
}

function isFetchTransportError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const cause = error.cause as { code?: string } | undefined;
  return (
    error.message === "fetch failed" ||
    [
      "ECONNRESET",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "UND_ERR_CONNECT_TIMEOUT",
    ].includes(cause?.code ?? "")
  );
}

async function fetchTextWithNodeHttps(
  url: string,
  signal: AbortSignal,
  headers: Record<string, string>,
  redirects = 0,
): Promise<string> {
  if (!url.startsWith("https://") || redirects > 3)
    throw new Error("HTTPS fallback could not resolve the source");
  return new Promise<string>((resolve, reject) => {
    const request = httpsGet(
      url,
      {
        signal,
        headers: {
          Accept: headers.Accept ?? "application/json",
          "User-Agent":
            headers["User-Agent"] ??
            "AcademicRaycast/1.0 (academic research extension)",
          ...headers,
        },
      },
      (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          void fetchTextWithNodeHttps(
            new URL(response.headers.location, url).href,
            signal,
            headers,
            redirects + 1,
          ).then(resolve, reject);
          return;
        }
        if (
          !response.statusCode ||
          response.statusCode < 200 ||
          response.statusCode >= 300
        ) {
          response.resume();
          reject(new Error(`HTTP ${response.statusCode ?? "unknown"}`));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 12 * 1024 * 1024) {
            request.destroy(new Error("Source response exceeded 12 MB"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          resolve(Buffer.concat(chunks).toString("utf8")),
        );
        response.on("error", reject);
      },
    );
    request.setTimeout(15_000, () =>
      request.destroy(new Error("Source request timed out after 15 seconds")),
    );
    request.on("error", reject);
  });
}

async function fetchResponse(
  url: string,
  signal: AbortSignal,
  headers: Record<string, string>,
): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const forwardAbort = () => controller.abort(signal.reason);
    const timeout = setTimeout(
      () =>
        controller.abort(
          new Error("Source request timed out after 15 seconds"),
        ),
      15_000,
    );
    if (signal.aborted) forwardAbort();
    else signal.addEventListener("abort", forwardAbort, { once: true });

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: headers.Accept ?? "application/json",
          "User-Agent": "AcademicRaycast/1.0 (academic research extension)",
          ...headers,
        },
      });
      if (response.ok) return response;

      if (
        attempt === 0 &&
        (response.status === 429 || response.status >= 500)
      ) {
        const retryAfter =
          Math.min(Number(response.headers.get("retry-after")) || 1, 3) * 1_000;
        await wait(retryAfter, signal);
        continue;
      }
      throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
    } catch (error) {
      if (signal.aborted) throw signal.reason ?? error;
      if (attempt === 0 && controller.signal.aborted) {
        await wait(750, signal);
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", forwardAbort);
    }
  }

  throw new Error("Source request failed after retry");
}

async function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason ?? new Error("Search cancelled"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function uniqueHttpUrls<T extends { url: string }>(links: T[]): T[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    if (!/^https?:\/\//i.test(link.url) || seen.has(link.url)) return false;
    seen.add(link.url);
    return true;
  });
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value))
    return value.flatMap((item) =>
      asString(item) ? [String(item).trim()] : [],
    );
  const stringValue = asString(value);
  return stringValue ? [stringValue] : [];
}
