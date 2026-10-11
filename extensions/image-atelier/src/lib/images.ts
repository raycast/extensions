import {
  readBounded,
  decodeImage,
  MAX_IMAGE_BYTES,
  MAX_JSON_BYTES,
} from "./response";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { isAbsolute, join, basename } from "node:path";
import { pathToFileURL } from "node:url";

export type Config = {
  baseUrl: string;
  apiKey: string;
  model: string;
  outputDirectory: string;
};
export type ImageInput = {
  prompt: string;
  size?: string;
  quality?: string;
  imagePath?: string;
};
export type ImageResult = {
  path: string;
  markdown: string;
  model: string;
  revisedPrompt?: string;
};

export function endpoint(base: string, edit: boolean): string {
  let url: URL;
  try {
    url = new URL(base.trim());
  } catch {
    throw new Error("API Base URL must be a valid URL including https://.");
  }
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
  ) {
    throw new Error(
      "Use HTTPS for the API, or HTTP on localhost for a local service.",
    );
  }
  if (url.username || url.password || url.search || url.hash)
    throw new Error(
      "Base URL must not contain credentials, query parameters, or a fragment.",
    );
  url.pathname =
    url.pathname
      .replace(/\/+$/, "")
      .replace(/\/images\/(generations|edits)$/, "") +
    (edit ? "/images/edits" : "/images/generations");
  return url.toString();
}

export function imageFormat(bytes: Uint8Array): {
  extension: string;
  mime: string;
} {
  const b = Buffer.from(bytes);
  if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return { extension: "png", mime: "image/png" };
  if (b[0] === 255 && b[1] === 216 && b[2] === 255)
    return { extension: "jpg", mime: "image/jpeg" };
  if (
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  )
    return { extension: "webp", mime: "image/webp" };
  throw new Error(
    "Expected a PNG, JPEG, or WebP image, but received unsupported content.",
  );
}

export async function createImage(
  config: Config,
  input: ImageInput,
): Promise<ImageResult> {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("Enter an image prompt.");
  if (!config.apiKey.trim() || !config.model.trim())
    throw new Error(
      "Set your API Key in extension preferences and use Choose Default Model in the Generate or Edit Image action menu.",
    );
  const url = endpoint(config.baseUrl, Boolean(input.imagePath));
  const fields: Record<string, string> = {
    model: config.model.trim(),
    prompt,
    n: "1",
  };
  if (input.size && input.size !== "default") fields.size = input.size;
  if (input.quality && input.quality !== "default")
    fields.quality = input.quality;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey.trim()}`,
  };
  let body: string | FormData;
  if (input.imagePath) {
    if (!isAbsolute(input.imagePath))
      throw new Error("Reference image must be an absolute local file path.");
    const info = await stat(input.imagePath);
    if (!info.isFile() || info.size > 50 * 1024 * 1024)
      throw new Error("Reference image must be a file smaller than 50 MB.");
    const bytes = await readFile(input.imagePath);
    const format = imageFormat(bytes);
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    form.set(
      "image",
      new Blob([new Uint8Array(bytes)], { type: format.mime }),
      basename(input.imagePath),
    );
    body = form;
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({ ...fields, n: 1 });
  }
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(300_000),
      redirect: "error",
    });
  } catch {
    throw new Error(
      "Image request failed or timed out. Check the API address and network. The provider may still have processed it; check there before retrying.",
    );
  }
  if (!response.ok) {
    // Do not echo arbitrary provider responses: they may contain credentials or private request data.
    const hint =
      response.status === 401 || response.status === 403
        ? "Check API Key and model permissions."
        : response.status === 429
          ? "Check provider balance and rate limits."
          : "Check provider logs, model ID, and supported image parameters.";
    throw new Error(`Image API returned HTTP ${response.status}. ${hint}`);
  }
  let payload: {
    data?: { b64_json?: string; url?: string; revised_prompt?: string }[];
  };
  const json = await readBounded(response, MAX_JSON_BYTES);
  try {
    payload = JSON.parse(json.toString("utf8")) as typeof payload;
  } catch {
    throw new Error(
      "API returned non-JSON content. Check that Base URL points to an Images API.",
    );
  }
  const item = payload?.data?.[0];
  if (!item)
    throw new Error(
      "API response has no data[0] image. This provider may use a different API format.",
    );
  let bytes: Buffer;
  if (item.b64_json) {
    bytes = decodeImage(item.b64_json);
  } else if (item.url) {
    const downloadUrl = new URL(item.url);
    if (downloadUrl.protocol !== "https:")
      throw new Error("The provider's image download URL must use HTTPS.");
    // Never forward the API token to returned image URLs.
    const download = await fetch(downloadUrl, {
      signal: AbortSignal.timeout(60_000),
      redirect: "error",
    });
    if (!download.ok)
      throw new Error(`Image download failed (HTTP ${download.status}).`);
    bytes = await readBounded(download, MAX_IMAGE_BYTES);
  } else {
    throw new Error(
      "API response must contain data[0].b64_json or data[0].url.",
    );
  }
  const format = imageFormat(bytes);
  await mkdir(config.outputDirectory, { recursive: true });
  const path = join(
    config.outputDirectory,
    `image-${Date.now()}-${randomUUID()}.${format.extension}`,
  );
  await writeFile(path, bytes, { flag: "wx" });
  return {
    path,
    markdown: `![Generated image](${pathToFileURL(path).href})`,
    model: config.model,
    revisedPrompt: item.revised_prompt,
  };
}
