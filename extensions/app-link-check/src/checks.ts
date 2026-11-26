/* eslint-disable @typescript-eslint/no-explicit-any -- parsed JSON from remote files */
import { CheckResult, Status } from "./model";

type Fetch = typeof fetch;

const HOST =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const SHA256 = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;
const MAX_BYTES = 256 * 1024;

export function normalizeDomain(input: string): string | undefined {
  const d = input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
  return HOST.test(d) ? d : undefined;
}

async function fetchText(f: Fetch, url: string, follow: boolean) {
  const res = await f(url, {
    redirect: follow ? "follow" : "manual",
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status >= 300 && res.status < 400)
    return { res, text: "", tooLarge: false };
  const { text, tooLarge } = await readCapped(res);
  return { res, text, tooLarge };
}

async function readCapped(
  res: Response,
): Promise<{ text: string; tooLarge: boolean }> {
  if (!res.body) {
    const text = await res.text();
    return text.length > MAX_BYTES
      ? { text: "", tooLarge: true }
      : { text, tooLarge: false };
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      return { text: "", tooLarge: true };
    }
    chunks.push(value);
  }
  return {
    text: new TextDecoder().decode(Buffer.concat(chunks)),
    tooLarge: false,
  };
}

export function evaluateAasa(
  data: any,
  iosAppId?: string,
): { status: Status; detail: string } {
  const details: any[] = Array.isArray(data?.applinks?.details)
    ? data.applinks.details
    : [];
  const raw: unknown[] = details.flatMap((d) =>
    Array.isArray(d?.appIDs) ? d.appIDs : d?.appID ? [d.appID] : [],
  );
  const ids: string[] = raw.filter(
    (v): v is string => typeof v === "string" && v.trim() !== "",
  );
  const malformed = raw.length - ids.length;
  if (ids.length === 0)
    return {
      status: "warn",
      detail: "File is valid JSON but lists no app IDs under applinks.details.",
    };
  if (malformed > 0)
    return {
      status: "warn",
      detail: `${malformed} app ID entr${malformed === 1 ? "y is" : "ies are"} not a non-empty string. Valid: ${ids.join(", ")}.`,
    };
  const extras = data?.webcredentials ? " Has webcredentials." : "";
  if (iosAppId) {
    return ids.includes(iosAppId)
      ? { status: "ok", detail: `Lists ${iosAppId}.${extras}` }
      : {
          status: "fail",
          detail: `${iosAppId} is not listed. Lists: ${ids.join(", ")}.`,
        };
  }
  return {
    status: "ok",
    detail: `Lists ${ids.length} app ID(s): ${ids.join(", ")}.${extras}`,
  };
}

export function evaluateAssetLinks(
  data: any,
  androidPackage?: string,
): { status: Status; detail: string } {
  if (!Array.isArray(data))
    return { status: "fail", detail: "Expected a JSON array of statements." };
  if (data.length === 0)
    return { status: "warn", detail: "The file lists no associations." };
  const apps = data.filter(
    (e: any) =>
      e?.target?.namespace === "android_app" &&
      Array.isArray(e?.relation) &&
      e.relation.includes("delegate_permission/common.handle_all_urls"),
  );
  if (apps.length === 0)
    return {
      status: "warn",
      detail: "No android_app statement with handle_all_urls.",
    };
  const fpsOf = (e: any): unknown[] =>
    Array.isArray(e.target.sha256_cert_fingerprints)
      ? e.target.sha256_cert_fingerprints
      : [];
  const names = apps.map((e: any) => e.target.package_name as string);
  if (androidPackage) {
    const hit = apps.find((e: any) => e.target.package_name === androidPackage);
    if (!hit)
      return {
        status: "fail",
        detail: `${androidPackage} is not listed. Lists: ${names.join(", ")}.`,
      };
    if (fpsOf(hit).length === 0)
      return {
        status: "fail",
        detail: `${androidPackage} is listed without a fingerprint.`,
      };
  }
  const missing = apps.filter((e: any) => fpsOf(e).length === 0).length;
  if (missing)
    return {
      status: "warn",
      detail: `${missing} android_app statement(s) have no sha256_cert_fingerprints array with entries.`,
    };
  const badFp = apps
    .flatMap((e: any) => fpsOf(e))
    .filter((fp) => typeof fp !== "string" || !SHA256.test(fp));
  if (badFp.length)
    return {
      status: "warn",
      detail: `${badFp.length} fingerprint(s) are not SHA-256 colon-hex format.`,
    };
  if (androidPackage) {
    const n = fpsOf(
      apps.find((e: any) => e.target.package_name === androidPackage),
    ).length;
    return {
      status: "ok",
      detail: `Lists ${androidPackage} with ${n} fingerprint(s).`,
    };
  }
  return {
    status: "ok",
    detail: `Lists ${names.length} app(s): ${names.join(", ")}.`,
  };
}

export async function checkAasa(
  f: Fetch,
  domain: string,
  iosAppId?: string,
): Promise<CheckResult> {
  const url = `https://${domain}/.well-known/apple-app-site-association`;
  const base = {
    id: "aasa",
    platform: "iOS" as const,
    title: "apple-app-site-association",
    url,
  };
  try {
    const { res, text, tooLarge } = await fetchText(f, url, false);
    if (res.status >= 300 && res.status < 400)
      return {
        ...base,
        status: "fail",
        detail: `Redirects (HTTP ${res.status}). Apple requires no redirects.`,
      };
    if (!res.ok)
      return { ...base, status: "fail", detail: `HTTP ${res.status}` };
    if (tooLarge)
      return {
        ...base,
        status: "fail",
        detail: `Response is larger than ${MAX_BYTES / 1024} KiB.`,
      };
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return { ...base, status: "fail", detail: "Response is not valid JSON." };
    }
    return { ...base, ...evaluateAasa(data, iosAppId) };
  } catch (e) {
    return {
      ...base,
      status: "fail",
      detail: `Could not fetch: ${(e as Error).message}`,
    };
  }
}

export async function checkAssetLinks(
  f: Fetch,
  domain: string,
  androidPackage?: string,
): Promise<CheckResult> {
  const url = `https://${domain}/.well-known/assetlinks.json`;
  const base = {
    id: "assetlinks",
    platform: "Android" as const,
    title: "assetlinks.json",
    url,
  };
  try {
    const { res, text, tooLarge } = await fetchText(f, url, false);
    if (res.status >= 300 && res.status < 400)
      return {
        ...base,
        status: "fail",
        detail: `Redirects (HTTP ${res.status}). Android requires no redirects.`,
      };
    if (!res.ok)
      return { ...base, status: "fail", detail: `HTTP ${res.status}` };
    if (tooLarge)
      return {
        ...base,
        status: "fail",
        detail: `Response is larger than ${MAX_BYTES / 1024} KiB.`,
      };
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return { ...base, status: "fail", detail: "Response is not valid JSON." };
    }
    const result = evaluateAssetLinks(data, androidPackage);
    const ct = res.headers.get("content-type") ?? "";
    if (
      result.status === "ok" &&
      ct.split(";")[0].trim().toLowerCase() !== "application/json"
    )
      return {
        ...base,
        status: "warn",
        detail: `${result.detail} Content-type is "${ct || "missing"}", Android expects application/json.`,
      };
    return { ...base, ...result };
  } catch (e) {
    return {
      ...base,
      status: "fail",
      detail: `Could not fetch: ${(e as Error).message}`,
    };
  }
}

export async function runChecks(opts: {
  domain: string;
  iosAppId?: string;
  androidPackage?: string;
  f?: Fetch;
}): Promise<CheckResult[]> {
  const f = opts.f ?? fetch;
  return Promise.all([
    checkAasa(f, opts.domain, opts.iosAppId?.trim() || undefined),
    checkAssetLinks(f, opts.domain, opts.androidPackage?.trim() || undefined),
  ]);
}
