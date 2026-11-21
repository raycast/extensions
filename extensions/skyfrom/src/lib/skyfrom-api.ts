import { setTimeout as delay } from "node:timers/promises";
import {
  CachedResponse,
  getRetryAfter,
  previewPath,
  readResponse,
  saveResponse,
  saveRetryAfter,
  withResponseLock,
} from "./sky-cache";
import { isLocalTime } from "./time";

const origin = "https://skyfrom.app";
const citySlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hexColor = /^#[\da-f]{6}$/i;
const day = 86_400_000;
const inFlight = new Map<string, Promise<CachedResponse>>();
const waiters: (() => void)[] = [];
let active = 0;
let retryAfter = 0;

export const formats = ["css", "tailwind", "svg", "json", "figma", "tokens"] as const;
export type ExportFormat = (typeof formats)[number];
export const formatLabels: Record<ExportFormat, string> = {
  css: "CSS Gradient",
  tailwind: "Tailwind Gradient",
  svg: "SVG",
  json: "JSON",
  figma: "Figma Design Tokens",
  tokens: "CSS Variables",
};

export type City = {
  slug: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  tz: string;
};

export type SkyRequest = { city: City; local?: string };

export class SkyFromError extends Error {
  constructor(
    message: string,
    readonly kind: "unavailable" | "limited" | "invalid" | "missing",
  ) {
    super(message);
  }
}

function invalidResponse(): never {
  throw new SkyFromError("SkyFrom returned an unreadable response. Try again in a moment.", "invalid");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseJSON(data: Buffer): unknown {
  try {
    return JSON.parse(data.toString("utf8"));
  } catch {
    invalidResponse();
  }
}

function isCity(value: unknown): value is City {
  if (
    !isRecord(value) ||
    typeof value.slug !== "string" ||
    !citySlug.test(value.slug) ||
    typeof value.name !== "string" ||
    !value.name ||
    typeof value.country !== "string" ||
    !/^[A-Z]{2}$/.test(value.country) ||
    typeof value.lat !== "number" ||
    Math.abs(value.lat) > 90 ||
    !Number.isFinite(value.lat) ||
    typeof value.lon !== "number" ||
    Math.abs(value.lon) > 180 ||
    !Number.isFinite(value.lon) ||
    typeof value.tz !== "string"
  )
    return false;

  try {
    new Intl.DateTimeFormat("en", { timeZone: value.tz });
    return true;
  } catch {
    return false;
  }
}

function parseCities(data: Buffer): City[] {
  const json = parseJSON(data);
  if (!Array.isArray(json) || json.length === 0 || !json.every(isCity)) invalidResponse();
  if (new Set(json.map((city) => city.slug)).size !== json.length) invalidResponse();
  return json;
}

function skyURL(request: SkyRequest, format: ExportFormat | "png", size?: ImageSize) {
  const { city, local } = request;
  if (!citySlug.test(city.slug)) throw new Error("Choose a city from Explore Sky.");
  if (local !== undefined && !isLocalTime(local)) throw new Error("Enter a valid date and time.");
  const url = new URL("/api/sky", origin);
  url.searchParams.set("city", city.slug);
  if (local) url.searchParams.set("t", local);
  if (format !== "json") url.searchParams.set("format", format);
  if (size) {
    url.searchParams.set("width", String(size.width));
    url.searchParams.set("height", String(size.height));
  }
  return url;
}

export function skyPage(request: SkyRequest): string {
  const url = new URL(`/${encodeURIComponent(request.city.slug)}`, origin);
  if (request.local) url.searchParams.set("t", request.local);
  return url.href;
}

function rateLimited() {
  const minutes = Math.max(1, Math.ceil((retryAfter - Date.now()) / 60_000));
  return new SkyFromError(`SkyFrom is limiting requests. Try again in about ${minutes} min.`, "limited");
}

async function checkCooldown() {
  retryAfter = Math.max(retryAfter, await getRetryAfter());
  if (Date.now() < retryAfter) throw rateLimited();
}

async function readBody(response: Response, maximum: number): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader || Number(response.headers.get("content-length")) > maximum) {
    await reader?.cancel().catch(() => undefined);
    invalidResponse();
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximum) invalidResponse();
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  if (total === 0) invalidResponse();
  return Buffer.concat(chunks, total);
}

async function download(url: URL, mime: string): Promise<Buffer> {
  for (const attempt of [0, 1]) {
    await checkCooldown();
    try {
      const response = await fetch(url, {
        redirect: "error",
        signal: AbortSignal.timeout(6_000),
        headers: { Accept: mime, "User-Agent": "SkyFrom-for-Raycast/1.0" },
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        if (response.status === 429) {
          const header = response.headers.get("retry-after");
          const until = header && /^\d+$/.test(header) ? Date.now() + Number(header) * 1000 : Date.parse(header ?? "");
          retryAfter = Math.max(retryAfter, Number.isFinite(until) ? until : Date.now() + 300_000);
          retryAfter = await saveRetryAfter(retryAfter);
          throw rateLimited();
        }
        if (response.status === 404)
          throw new SkyFromError("SkyFrom could not find this city. Choose another city in Explore Sky.", "missing");
        if (attempt === 0 && [500, 502, 503, 504].includes(response.status)) {
          await delay(400);
          continue;
        }
        throw new SkyFromError("SkyFrom could not complete the request. Try again later.", "unavailable");
      }
      if (response.headers.get("content-type")?.split(";")[0].toLowerCase() !== mime) {
        await response.body?.cancel().catch(() => undefined);
        invalidResponse();
      }
      return await readBody(response, mime === "image/png" ? 16 * 1024 * 1024 : 512 * 1024);
    } catch (error) {
      if (error instanceof SkyFromError) throw error;
      if (attempt === 0) {
        await delay(400);
        continue;
      }
      throw new SkyFromError("Couldn’t reach SkyFrom. Check your connection and try again.", "unavailable");
    }
  }
  throw new SkyFromError("SkyFrom is unavailable. Try again later.", "unavailable");
}

function sharedDownload(url: URL, mime: string, ttl: number, validate: (data: Buffer) => unknown) {
  const existing = inFlight.get(url.href);
  if (existing) return existing;

  const pending = (async () => {
    if (active === 3) await new Promise<void>((resolve) => waiters.push(resolve));
    else active += 1;
    try {
      return await withResponseLock(url, async () => {
        // A different Raycast command may have just populated the cache.
        const cached = await readResponse(url);
        if (cached && Date.now() - cached.savedAt < ttl) {
          try {
            validate(cached.data);
            return cached;
          } catch {
            // Refresh an unreadable cached response.
          }
        }
        const data = await download(url, mime);
        validate(data);
        const savedAt = Date.now();
        await saveResponse(url, data, savedAt);
        return { data, savedAt };
      });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ELOCKED") {
        throw new SkyFromError("SkyFrom is already loading this sky. Try again in a moment.", "unavailable");
      }
      throw error;
    } finally {
      const next = waiters.shift();
      if (next) next();
      else active -= 1;
      inFlight.delete(url.href);
    }
  })();
  inFlight.set(url.href, pending);
  return pending;
}

async function request<T>(
  url: URL,
  mime: string,
  parse: (data: Buffer) => T,
  { staleOnError = true }: { staleOnError?: boolean } = {},
) {
  const ttl = url.pathname === "/api/cities" || url.searchParams.has("t") ? day : 60_000;
  const stored = await readResponse(url);
  let cached: { value: T; savedAt: number } | undefined;
  if (stored) {
    try {
      cached = { value: parse(stored.data), savedAt: stored.savedAt };
    } catch {
      // A bad cache entry is repaired by the next successful request.
    }
  }
  if (cached && Date.now() - cached.savedAt < ttl) return { ...cached, stale: false };

  try {
    const { data, savedAt } = await sharedDownload(url, mime, ttl, parse);
    return { value: parse(data), savedAt, stale: false };
  } catch (error) {
    if (cached && staleOnError) return { ...cached, stale: true };
    throw error;
  }
}

let citiesPromise: Promise<City[]> | undefined;

export async function getCities() {
  citiesPromise ??= request(new URL("/api/cities", origin), "application/json", parseCities).then(({ value }) => value);
  try {
    return await citiesPromise;
  } catch (error) {
    citiesPromise = undefined;
    throw error;
  }
}

function parseSky(data: Buffer) {
  const json = parseJSON(data);
  if (
    !isRecord(json) ||
    !isRecord(json.place) ||
    !isRecord(json.time) ||
    !Array.isArray(json.stops) ||
    typeof json.place.city !== "string" ||
    !isLocalTime(json.time.local) ||
    typeof json.time.utc !== "string" ||
    !Number.isFinite(Date.parse(json.time.utc)) ||
    json.stops.length < 2 ||
    json.stops.length > 32
  )
    invalidResponse();

  const colors = json.stops.map((stop: unknown) => {
    if (!isRecord(stop) || typeof stop.hex !== "string" || !hexColor.test(stop.hex)) invalidResponse();
    return stop.hex;
  });
  return { slug: json.place.city, local: json.time.local, utc: json.time.utc, colors };
}

export async function cachedCurrentSky(city: City) {
  const stored = await readResponse(skyURL({ city }, "json"));
  if (!stored) return undefined;
  try {
    const value = parseSky(stored.data);
    if (value.slug === city.slug) return { value, savedAt: stored.savedAt };
  } catch {
    return undefined;
  }
}

export async function cachedCities() {
  const stored = await readResponse(new URL("/api/cities", origin));
  if (!stored) return [];
  try {
    return parseCities(stored.data);
  } catch {
    return [];
  }
}

export function getSky(sky: SkyRequest, options?: { staleOnError?: boolean }) {
  return request(
    skyURL(sky, "json"),
    "application/json",
    (data) => {
      const result = parseSky(data);
      if (result.slug !== sky.city.slug) invalidResponse();
      if (sky.local && result.local !== sky.local) {
        throw new Error(`That clock time does not exist in ${sky.city.name} on that date. Choose a different time.`);
      }
      return result;
    },
    options,
  );
}

const contentTypes: Record<ExportFormat, string> = {
  css: "text/css",
  tailwind: "text/css",
  svg: "image/svg+xml",
  json: "application/json",
  figma: "application/json",
  tokens: "text/css",
};

export async function getExport(sky: SkyRequest, format: ExportFormat) {
  const validate = {
    css: /^background:\s*linear-gradient\(/,
    tailwind: /^@theme\s*\{/,
    svg: /^<svg\b[\s\S]*<\/svg>$/,
    tokens: /^:root\s*\{/,
  };
  const result = await request(skyURL(sky, format), contentTypes[format], (data) => {
    const content = data.toString("utf8");
    if (format === "json") {
      const skyData = parseSky(data);
      if (skyData.slug !== sky.city.slug || (sky.local && skyData.local !== sky.local)) invalidResponse();
    } else if (format === "figma") {
      const design = parseJSON(data);
      if (!isRecord(design) || !isRecord(design.skyfrom)) invalidResponse();
      const tokens = Object.values(design.skyfrom);
      if (
        !tokens.length ||
        !tokens.every(
          (token) =>
            isRecord(token) &&
            token.$type === "color" &&
            typeof token.$value === "string" &&
            hexColor.test(token.$value),
        )
      )
        invalidResponse();
    } else if (!validate[format].test(content.trim())) {
      invalidResponse();
    }
    return content;
  });
  return result.value;
}

export type ImageSize = { width: number; height: number };
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const pngEnd = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);

function validatePNG(data: Buffer, size: ImageSize) {
  if (
    data.length < 57 ||
    !data.subarray(0, 8).equals(pngSignature) ||
    data.readUInt32BE(8) !== 13 ||
    data.toString("ascii", 12, 16) !== "IHDR" ||
    data.readUInt32BE(16) !== size.width ||
    data.readUInt32BE(20) !== size.height ||
    !data.subarray(-12).equals(pngEnd)
  )
    invalidResponse();

  let hasData = false;
  for (let offset = 8; offset < data.length - 12;) {
    const end = offset + data.readUInt32BE(offset) + 12;
    if (end > data.length - 12) invalidResponse();
    if (data.toString("ascii", offset + 4, offset + 8) === "IDAT") hasData = true;
    offset = end;
  }
  if (!hasData) invalidResponse();
  return data;
}

export function getPNG(sky: SkyRequest, size: ImageSize, options?: { staleOnError?: boolean }) {
  if (![size.width, size.height].every((side) => Number.isInteger(side) && side > 0 && side <= 4096)) {
    throw new Error("Choose an image size between 1 and 4,096 pixels per side.");
  }
  return request(skyURL(sky, "png", size), "image/png", (data) => validatePNG(data, size), options);
}

export async function getPreview(sky: SkyRequest, size: ImageSize) {
  const { value, stale } = await getPNG(sky, size);
  return { path: await previewPath(value), stale };
}

export async function cachedPNGPath(sky: SkyRequest, size: ImageSize) {
  const cached = await readResponse(skyURL(sky, "png", size));
  if (!cached) return undefined;
  try {
    return await previewPath(validatePNG(cached.data, size));
  } catch {
    return undefined;
  }
}
