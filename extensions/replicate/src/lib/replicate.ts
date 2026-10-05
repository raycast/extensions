import { getPreferenceValues } from "@raycast/api";
import { lookup } from "node:dns/promises";
import { readFile, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { basename, extname } from "node:path";
import { CollectionResponse, CollectionsResponse, Model, Prediction, ReplicateFile, SearchResponse } from "../types";
import { extensionFor } from "../utils/output";
import { isRunning } from "../utils/status";

const API_BASE = "https://api.replicate.com/v1";

export const USER_AGENT = "raycast-replicate (+https://www.raycast.com/KevinBatdorf/replicate)";

export class ReplicateError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ReplicateError";
    this.status = status;
  }
}

export const isAuthError = (error: unknown) =>
  error instanceof ReplicateError && (error.status === 401 || error.status === 403);

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const replicateFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const { token } = getPreferenceValues<Preferences>();
  const response = await fetch(path.startsWith("http") ? path : `${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const body = await response.text();
  let data: unknown;
  try {
    data = body ? JSON.parse(body) : undefined;
  } catch {
    // Gateway and rate-limit errors arrive as HTML, so only the status is usable.
  }

  if (!response.ok) {
    const detail = (data as { detail?: string } | undefined)?.detail;
    throw new ReplicateError(response.status, detail ?? `${response.status} ${response.statusText}`);
  }

  return data as T;
};

export const downloadFile = async (url: string, destination: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ReplicateError(response.status, `Download failed with ${response.status} ${response.statusText}`);
  }
  // Some output URLs have no extension, which leaves the saved file unopenable.
  const extension = extname(destination) ? undefined : extensionFor(response.headers.get("content-type"));
  const path = extension ? `${destination}.${extension}` : destination;
  await writeFile(path, Buffer.from(await response.arrayBuffer()));
  return path;
};

export const getPrediction = (id: string) => replicateFetch<Prediction>(`/predictions/${id}`);

export const cancelPrediction = (id: string) =>
  replicateFetch<unknown>(`/predictions/${id}/cancel`, { method: "POST" });

// Replicate publishes forty-odd collections; these are the ones worth reaching first.
export const MAIN_COLLECTIONS = [
  "text-to-image",
  "image-editing",
  "language-models",
  "text-to-video",
  "upscale-images",
  "audio-generation",
];

export const modelId = (model: Pick<Model, "owner" | "name">) => `${model.owner}/${model.name}`;

// The API only sorts models by date, so the most-run list is pooled from the main collections.
export const listModels = async () => {
  const lists = await Promise.all(MAIN_COLLECTIONS.map((slug) => collectionModels(slug).catch(() => [])));
  const unique = new Map(lists.flat().map((model) => [modelId(model), model]));
  return [...unique.values()].sort(byRunCount);
};

const byRunCount = (first: Model, second: Model) => (second.run_count ?? 0) - (first.run_count ?? 0);

export const listCollections = async () => (await replicateFetch<CollectionsResponse>("/collections")).results;

export const collectionModels = async (slug: string) => {
  const collection = await replicateFetch<CollectionResponse>(`/collections/${slug}`);
  return (collection.models ?? []).sort(byRunCount);
};

export const searchModels = async (query: string) => {
  const response = await replicateFetch<SearchResponse>(`/search?query=${encodeURIComponent(query)}&limit=20`);
  return (response.models ?? []).map((result) => result.model);
};

export const getModel = (owner: string, name: string) => replicateFetch<Model>(`/models/${owner}/${name}`);

// Stopping a chat doesn't stop its prediction, so runs from Raycast AI cap themselves.
export const RAYCAST_AI_RUN_MINUTES = 5;
export const RAYCAST_AI_CANCEL_AFTER = `${RAYCAST_AI_RUN_MINUTES}m`;

export const createPrediction = ({
  owner,
  name,
  version,
  official,
  input,
  wait,
  cancelAfter,
}: {
  owner: string;
  name: string;
  version?: string;
  official?: boolean;
  input: Record<string, unknown>;
  wait?: number;
  cancelAfter?: string;
}) => {
  // Official models can still list a latest version, but they run and bill on their own endpoint.
  const pinned = version && !official;
  return replicateFetch<Prediction>(pinned ? "/predictions" : `/models/${owner}/${name}/predictions`, {
    method: "POST",
    headers: {
      ...(wait ? { Prefer: `wait=${wait}` } : {}),
      ...(cancelAfter ? { "Cancel-After": cancelAfter } : {}),
    },
    body: JSON.stringify({ ...(pinned ? { version } : {}), input }),
  });
};

export const uploadBytes = async (bytes: Buffer, filename: string, type?: string) => {
  const { token } = getPreferenceValues<Preferences>();
  const body = new FormData();
  body.append("content", new Blob([bytes], type ? { type } : undefined), filename);

  const response = await fetch(`${API_BASE}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT },
    body,
  });
  if (!response.ok) {
    throw new ReplicateError(response.status, `Uploading ${filename} failed with ${response.status}.`);
  }

  const file = (await response.json()) as ReplicateFile;
  if (!file.urls?.get) throw new ReplicateError(response.status, "The upload returned no file URL.");
  return file.urls.get;
};

export const uploadFile = async (path: string) => uploadBytes(await readFile(path), basename(path));

const DOWNLOAD_TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 5;

const isPublicAddress = (address: string) => {
  const ip = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1] ?? address;
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  const lower = ip.toLowerCase();
  return !(lower === "::" || lower === "::1" || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower));
};

const isPublicHost = async (url: URL) => {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true }).catch(() => [])).map((entry) => entry.address);
  return addresses.length > 0 && addresses.every(isPublicAddress);
};

// Blocks links to this computer or its network, whose replies would otherwise be uploaded to Replicate.
const fetchPublic = async (link: string) => {
  let url = new URL(link);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!/^https?:$/.test(url.protocol) || !(await isPublicHost(url))) {
      throw new Error("That link points to this computer or a private network, so nothing ran.");
    }
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "manual",
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    }).catch(() => undefined);
    const location = response?.headers.get("location");
    if (!response || response.status < 300 || response.status >= 400 || !location) return response;
    url = new URL(location, url);
  }
  return undefined;
};

// Some sites refuse Replicate's servers (Wikimedia answers them 403), so a linked image is copied over.
export const imageForModel = async (url: string) => {
  if (!/^https?:/.test(url)) return url;

  if (url.startsWith("https://replicate.delivery/")) {
    // Replicate deletes outputs about an hour after a run, and a dead link fails the run vaguely.
    const response = await fetch(url, { method: "HEAD" }).catch(() => undefined);
    if (response?.status === 404 || response?.status === 410) {
      throw new Error("That image has expired on Replicate, so nothing ran. Attach it to your message to edit it.");
    }
    return url;
  }

  const response = await fetchPublic(url);
  const type = response?.headers.get("content-type") ?? undefined;
  if (!response?.ok || type?.startsWith("text/html")) {
    const status = response && !response.ok ? ` (${response.status})` : "";
    throw new Error(
      `Couldn't download an image from that link${status}, so nothing ran. Attach the image to your message instead.`,
    );
  }
  return uploadBytes(Buffer.from(await response.arrayBuffer()), `image.${extensionFor(type) ?? "png"}`, type);
};

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Follow = { interval?: number; timeout?: number };

// Stops at the timeout rather than throwing, so a caller can report a prediction still running.
export async function* followPrediction(
  initial: Prediction,
  { interval = POLL_INTERVAL_MS, timeout = POLL_TIMEOUT_MS }: Follow = {},
) {
  const deadline = Date.now() + timeout;
  let prediction = initial;
  yield prediction;
  while (isRunning(prediction) && Date.now() < deadline) {
    await sleep(interval);
    prediction = await getPrediction(prediction.id);
    yield prediction;
  }
}

export const waitForPrediction = async (initial: Prediction, options?: Follow) => {
  let latest = initial;
  for await (const prediction of followPrediction(initial, options)) latest = prediction;
  return latest;
};

export const stillRunning = (prediction: Prediction) =>
  new Error(
    `The prediction is still running. Check it at https://replicate.com/p/${prediction.id} and try a faster model.`,
  );
