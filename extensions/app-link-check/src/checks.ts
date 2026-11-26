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
  const text =
    res.status >= 300 && res.status < 400
      ? ""
      : (await res.text()).slice(0, MAX_BYTES);
  return { res, text };
}

export function evaluateAasa(
  data: any,
  iosAppId?: string,
): { status: Status; detail: string } {
  const details: any[] = Array.isArray(data?.applinks?.details)
    ? data.applinks.details
    : [];
  const ids: string[] = details.flatMap((d) =>
    Array.isArray(d?.appIDs) ? d.appIDs : d?.appID ? [d.appID] : [],
  );
  if (ids.length === 0)
    return {
      status: "warn",
      detail: "File is valid JSON but lists no app IDs under applinks.details.",
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
  const badFp = apps
    .flatMap((e: any) => (e.target.sha256_cert_fingerprints ?? []) as string[])
    .filter((fp) => !SHA256.test(fp));
  const names = apps.map((e: any) => e.target.package_name as string);
  if (badFp.length)
    return {
      status: "warn",
      detail: `${badFp.length} fingerprint(s) are not SHA-256 colon-hex format.`,
    };
  if (androidPackage) {
    const hit = apps.find((e: any) => e.target.package_name === androidPackage);
    if (!hit)
      return {
        status: "fail",
        detail: `${androidPackage} is not listed. Lists: ${names.join(", ")}.`,
      };
    const n = (hit.target.sha256_cert_fingerprints ?? []).length;
    return n
      ? {
          status: "ok",
          detail: `Lists ${androidPackage} with ${n} fingerprint(s).`,
        }
      : {
          status: "fail",
          detail: `${androidPackage} is listed without a fingerprint.`,
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
    const { res, text } = await fetchText(f, url, false);
    if (res.status >= 300 && res.status < 400)
      return {
        ...base,
        status: "fail",
        detail: `Redirects (HTTP ${res.status}). Apple requires no redirects.`,
      };
    if (!res.ok)
      return { ...base, status: "fail", detail: `HTTP ${res.status}` };
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
    const { res, text } = await fetchText(f, url, false);
    if (res.status >= 300 && res.status < 400)
      return {
        ...base,
        status: "fail",
        detail: `Redirects (HTTP ${res.status}). Android requires no redirects.`,
      };
    if (!res.ok)
      return { ...base, status: "fail", detail: `HTTP ${res.status}` };
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return { ...base, status: "fail", detail: "Response is not valid JSON." };
    }
    const result = evaluateAssetLinks(data, androidPackage);
    const ct = res.headers.get("content-type") ?? "";
    if (result.status === "ok" && !/application\/json/i.test(ct))
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
