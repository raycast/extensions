import { request } from "https";

// remove.bg's API moved to Leonardo.Ai on December 1, 2026.
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
  errors?: { message?: string }[];
  error?: string;
}

interface HttpResponse {
  statusCode: number;
  body: Buffer;
}

// Leonardo's sync call times out on its side after about 27 seconds, so these
// leave headroom while still freeing the form if a connection hangs.
const GENERATION_TIMEOUT_MS = 45_000;
const DOWNLOAD_TIMEOUT_MS = 30_000;

function send(
  url: string,
  method: string,
  timeoutMs: number,
  timeoutMessage: string,
  headers: Record<string, string> = {},
  body?: string
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const req = request(url, { method, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        clearTimeout(timer);
        resolve({ statusCode: res.statusCode ?? 0, body: Buffer.concat(chunks) });
      });
      res.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
    const timer = setTimeout(() => req.destroy(new Error(timeoutMessage)), timeoutMs);
    req.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    req.end(body);
  });
}

function errorMessage(json: LeonardoResponse, statusCode: number): string {
  if (json.errors?.[0]?.message) {
    return json.errors[0].message;
  }
  if (json.results && json.results.length === 0) {
    return "Leonardo.Ai returned no image";
  }
  return json.error || `Leonardo.Ai request failed (HTTP ${statusCode})`;
}

// Returns the cutout as PNG bytes, like the remove.bg API did.
export async function removeBackground({ apiKey, image, size, type, crop, scale }: RemoveBackgroundOptions) {
  const response = await send(
    LEONARDO_SYNC_URL,
    "POST",
    GENERATION_TIMEOUT_MS,
    "Leonardo.Ai took too long to respond. Please try again.",
    { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json" },
    JSON.stringify({
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
    })
  );

  let json: LeonardoResponse = {};
  try {
    json = JSON.parse(response.body.toString("utf8"));
  } catch {
    // Non JSON error bodies fall through to the HTTP status below.
  }

  const url = json.results?.[0]?.url;
  if (!url) {
    throw new Error(errorMessage(json, response.statusCode));
  }

  const result = await send(
    url,
    "GET",
    DOWNLOAD_TIMEOUT_MS,
    "Downloading the result from Leonardo.Ai timed out. Please try again."
  );
  if (result.statusCode !== 200) {
    throw new Error(`Could not download the result from Leonardo.Ai (HTTP ${result.statusCode})`);
  }
  return result.body;
}
