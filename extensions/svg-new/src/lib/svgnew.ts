import { getPreferenceValues } from "@raycast/api";

const API_BASE = "https://svg.new/api/agent";

/** The API stops a request after 300 s; give up a little later than that. */
const REQUEST_TIMEOUT_MS = 330_000;
/** A conversion that streams nothing (not even progress) for this long has stalled. */
const STALL_TIMEOUT_MS = 90_000;
const DOWNLOAD_TIMEOUT_MS = 120_000;
const TIMEOUT_MESSAGE = "SVG.new took too long to respond. Try again.";

/** An abort signal that fires after `totalMs`, or after `idleMs` without a call to `touch`. */
function deadline(totalMs: number, idleMs = totalMs) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const total = setTimeout(abort, totalMs);
  let idle = setTimeout(abort, idleMs);
  return {
    signal: controller.signal,
    touch() {
      clearTimeout(idle);
      idle = setTimeout(abort, idleMs);
    },
    clear() {
      clearTimeout(total);
      clearTimeout(idle);
    },
  };
}

/** Runs a request, body included, under a deadline, and reports a timeout in plain words. */
async function withDeadline<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const timer = deadline(ms);
  try {
    return await run(timer.signal);
  } catch (error) {
    throw timer.signal.aborted ? new Error(TIMEOUT_MESSAGE) : error;
  } finally {
    timer.clear();
  }
}

/** An error response from the SVG.new API. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface Progress {
  stage: string;
  percent: number;
}

/** An SVG returned by the API: inline text, or a one-hour download link for large results. */
export interface SvgResult {
  svg?: string;
  svgUrl?: string;
}

export interface VectorizeResult extends SvgResult {
  creditsRemaining?: number;
}

export interface RemoveBackgroundResult extends SvgResult {
  png?: Buffer;
  pngUrl?: string;
}

async function post(
  endpoint: string,
  body: Record<string, unknown>,
  signal: AbortSignal,
  accept = "application/json",
): Promise<Response> {
  const { apiKey } = getPreferenceValues<Preferences>();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Accept: accept,
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await toApiError(response);
  return response;
}

async function toApiError(response: Response): Promise<ApiError> {
  if (response.status === 401) {
    return new ApiError(401, "Invalid API key. Check it in the extension preferences.");
  }
  if (response.status === 413) {
    return new ApiError(413, "The image is too large to upload.");
  }
  let message = "";
  try {
    const data = JSON.parse(await response.text());
    if (typeof data?.error === "string") message = data.error;
  } catch {
    // The body was not JSON; fall back to the status code.
  }
  return new ApiError(response.status, message || `SVG.new returned an error (${response.status}).`);
}

function toSvgResult(data: Record<string, unknown>): SvgResult {
  const result: SvgResult = {
    svg: typeof data.svg === "string" ? data.svg : undefined,
    svgUrl: typeof data.svg_url === "string" ? data.svg_url : undefined,
  };
  if (!result.svg && !result.svgUrl) throw new Error("SVG.new returned no SVG.");
  return result;
}

function toVectorizeResult(data: Record<string, unknown>): VectorizeResult {
  const metadata = data.metadata as { credits_remaining?: unknown } | undefined;
  const credits = metadata?.credits_remaining;
  return { ...toSvgResult(data), creditsRemaining: typeof credits === "number" ? credits : undefined };
}

/**
 * Vectorizes an image given as a base64 data URL, streaming progress events.
 * With `link`, the API returns a download link instead of the SVG text.
 */
export async function vectorize(
  image: string,
  options: { onProgress?: (progress: Progress) => void; link?: boolean } = {},
): Promise<VectorizeResult> {
  const timer = deadline(REQUEST_TIMEOUT_MS, STALL_TIMEOUT_MS);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const body = { image, ...(options.link ? { output: "url" } : {}) };
    const response = await post("/vectorize", body, timer.signal, "text/event-stream");

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/event-stream") || !response.body) {
      return toVectorizeResult((await response.json()) as Record<string, unknown>);
    }

    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let event = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      timer.touch();

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          event = line.slice(7).trim();
          continue;
        }
        if (!line.startsWith("data: ")) continue;

        const data = JSON.parse(line.slice(6));
        if (event === "progress") {
          options.onProgress?.(data as Progress);
        } else if (event === "result") {
          return toVectorizeResult(data);
        } else if (event === "error") {
          throw new ApiError(500, data.message || "Vectorization failed.");
        }
        event = "";
      }
    }

    throw new Error("SVG.new closed the connection before sending a result.");
  } catch (error) {
    throw timer.signal.aborted ? new Error(TIMEOUT_MESSAGE) : error;
  } finally {
    timer.clear();
    // Stops the stream however the conversion ended: result, error or timeout.
    await reader?.cancel().catch(() => undefined);
  }
}

/** Removes the background from an SVG, using the original image as the guide. */
export async function removeBackground(image: string, vector: SvgResult): Promise<RemoveBackgroundResult> {
  const data = await withDeadline(REQUEST_TIMEOUT_MS, async (signal) => {
    const body = { image, ...(vector.svgUrl ? { svg_url: vector.svgUrl } : { svg: vector.svg }) };
    const response = await post("/edit/remove-background", body, signal);
    return (await response.json()) as Record<string, unknown>;
  });

  const result: RemoveBackgroundResult = toSvgResult(data);
  const transparent = data.transparent_image;
  if (typeof transparent === "string" && transparent.startsWith("data:image/png;base64,")) {
    result.png = Buffer.from(transparent.slice("data:image/png;base64,".length), "base64");
  } else if (typeof data.png_url === "string") {
    result.pngUrl = data.png_url;
  } else {
    throw new Error("SVG.new returned no transparent image.");
  }
  return result;
}

/** Downloads a result link from the API. */
export async function download(url: string): Promise<Buffer> {
  return withDeadline(DOWNLOAD_TIMEOUT_MS, async (signal) => {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Could not download the result (${response.status}).`);
    return Buffer.from(await response.arrayBuffer());
  });
}

/** The SVG text of a result, downloading it when the API sent a link. */
export async function svgText(result: SvgResult): Promise<string> {
  if (result.svg) return result.svg;
  return (await download(result.svgUrl as string)).toString("utf8");
}
