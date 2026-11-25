import { request } from "https";

// remove.bg's API moves to Leonardo.Ai on December 1, 2026.
// https://docs.leonardo.ai/docs/migrate-from-the-removebg-api-to-leonardoai
const LEONARDO_SYNC_URL = "https://cloud.leonardo.ai/api/rest/v2/generationssync";

interface RemoveBackgroundOptions {
  apiKey: string;
  image: Buffer;
  size: string;
  type: string;
  crop: boolean;
  scale: string;
}

interface LeonardoResponse {
  results?: { url?: string }[];
  blockedCount?: number;
  errors?: { message?: string; extensions?: { statusCode?: number; code?: string } }[];
  error?: string;
  code?: string;
}

interface SendOptions {
  url: string;
  method: "GET" | "POST";
  timeoutMs: number;
  timeoutMessage: string;
  headers?: Record<string, string>;
  body?: string;
}

interface HttpResponse {
  statusCode: number;
  body: Buffer;
}

// Leonardo's sync call times out on its side after about 27 seconds, so these
// leave headroom while still freeing the form if a connection hangs.
const GENERATION_TIMEOUT_MS = 45_000;
const DOWNLOAD_TIMEOUT_MS = 30_000;

function send({ url, method, timeoutMs, timeoutMessage, headers = {}, body }: SendOptions): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    let timedOut = false;

    // Covers connection errors on the request and on the response stream. After a timeout the
    // socket is destroyed on purpose, so report the timeout instead of the resulting "aborted".
    function fail(error: Error) {
      clearTimeout(timer);
      const unreachable = `Could not reach Leonardo.Ai (${error.message}). Check your connection and try again.`;
      reject(new Error(timedOut ? timeoutMessage : unreachable));
    }

    const req = request(url, { method, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        clearTimeout(timer);
        resolve({ statusCode: res.statusCode ?? 0, body: Buffer.concat(chunks) });
      });
      res.on("error", fail);
    });
    const timer = setTimeout(() => {
      timedOut = true;
      req.destroy(new Error(timeoutMessage));
    }, timeoutMs);
    req.on("error", fail);
    req.end(body);
  });
}

function errorMessage(json: LeonardoResponse, statusCode: number): string {
  const apiError = json.errors?.[0];
  const apiMessage = apiError?.message || json.error;
  const code = apiError?.extensions?.code || json.code;
  // Hasura can return HTTP 200 and put the actual error status inside extensions.
  if (statusCode === 200) {
    statusCode = apiError?.extensions?.statusCode ?? statusCode;
  }

  // A wrong key comes back as 401 "Authentication hook unauthorized this request". Most people who hit it
  // pasted their old remove.bg key, so say that instead of showing the raw message.
  if (
    statusCode === 401 ||
    code === "access-denied" ||
    /auth(?:entication|ori[sz]ation) hook/i.test(apiMessage ?? "")
  ) {
    return "Leonardo.Ai rejected the API key. Check the preferences (remove.bg keys do not work).";
  }
  if (statusCode === 413) {
    return "The image is too large for Leonardo.Ai. Try a smaller copy.";
  }
  if (statusCode === 429) {
    return "Leonardo.Ai is limiting requests right now. Wait a minute and try again.";
  }
  if (apiMessage) {
    return apiMessage;
  }
  if (statusCode >= 500) {
    return `Leonardo.Ai is not available right now (HTTP ${statusCode}). Please try again.`;
  }
  if (statusCode === 200) {
    return json.blockedCount ? "Leonardo.Ai withheld the result (content moderation)" : "Leonardo.Ai returned no image";
  }
  return `Leonardo.Ai request failed (HTTP ${statusCode})`;
}

// Returns the cutout as PNG bytes, like the remove.bg API did.
export async function removeBackground({ apiKey, image, size, type, crop, scale }: RemoveBackgroundOptions) {
  const response = await send({
    url: LEONARDO_SYNC_URL,
    method: "POST",
    timeoutMs: GENERATION_TIMEOUT_MS,
    timeoutMessage: "Leonardo.Ai took too long to respond. Please try again.",
    // Pasted keys often carry a trailing newline or space, which Node rejects in a header.
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "remove-bg",
      ephemeral: true,
      parameters: {
        size,
        type,
        crop,
        scale,
        format: "png",
        guidances: { image_reference: [{ image: { type: "BASE64", data: image.toString("base64") } }] },
      },
    }),
  });

  let json: LeonardoResponse = {};
  try {
    const parsed = JSON.parse(response.body.toString("utf8"));
    if (parsed && typeof parsed === "object") {
      json = parsed;
    }
  } catch {
    if (response.statusCode === 200) {
      throw new Error("Leonardo.Ai returned an invalid response. Please try again.");
    }
    // Non JSON error bodies fall through to the HTTP status below.
  }

  const url = json.results?.[0]?.url;
  if (response.statusCode !== 200 || json.errors?.length || json.error || typeof url !== "string" || !url) {
    throw new Error(errorMessage(json, response.statusCode));
  }

  const result = await send({
    url,
    method: "GET",
    timeoutMs: DOWNLOAD_TIMEOUT_MS,
    timeoutMessage: "Downloading the result from Leonardo.Ai timed out. Please try again.",
  });
  if (result.statusCode !== 200) {
    throw new Error(`Could not download the result from Leonardo.Ai (HTTP ${result.statusCode})`);
  }
  return result.body;
}
