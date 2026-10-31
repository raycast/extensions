import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import path from "node:path";

export const MAX_BYTES = 2 * 1024 * 1024;
const ORIGIN = "https://brewpage.app";
const RESERVED_HOST_LABELS = new Set([
  "unlock",
  "www",
  "api",
  "admin",
  "assets",
  "static",
  "cdn",
  "status",
  "health",
  "metrics",
  "grafana",
  "prometheus",
  "monitoring",
  "autoconfig",
  "autodiscover",
  "fe-bounces",
  "account",
]);
export type Choices = { visibility: string; protection: string; password?: string };
export type Report = { content: string; format: "html" | "markdown"; filename?: string };
export type Publication = {
  link: string;
  expiresAt: string;
  id: string;
  namespace: string;
  retryOwnerStorage?: () => Promise<void>;
};
type Owner = { ownerToken: string; manageUrl?: string; managementLink?: string; ownerLink: string };
type Options = { confirm: () => Promise<boolean>; saveOwner: (key: string, owner: Owner) => Promise<void> };

export function validateChoices(choices: Choices) {
  if (!["public", "unlisted"].includes(choices.visibility)) throw new Error("Choose Public or Unlisted.");
  if (!["none", "password"].includes(choices.protection)) throw new Error("Choose password protection or no password.");
  if (choices.protection === "password" && (!choices.password?.trim() || /[\r\n]/.test(choices.password)))
    throw new Error("Enter a password without line breaks.");
  if (choices.protection === "password") {
    try {
      const header = new Headers({ "X-Password": choices.password! });
      if (/\p{Cc}/u.test(choices.password!) || header.get("X-Password") !== choices.password) throw new Error();
    } catch {
      throw new Error(
        "This password cannot be sent unchanged. Remove unsupported characters or leading/trailing whitespace.",
      );
    }
  }
  if (choices.protection === "none" && choices.password) throw new Error("Clear the password or enable protection.");
}

export function validateReport(report: Report) {
  if (!report.content.trim()) throw new Error("Enter report content.");
  if (Buffer.byteLength(report.content, "utf8") > MAX_BYTES) throw new Error("Report exceeds the 2 MiB client limit.");
  if (!["html", "markdown"].includes(report.format)) throw new Error("Choose HTML or Markdown.");
}

export async function readSelectedFile(filename: string): Promise<Report> {
  const absolute = path.resolve(filename);
  const parts = absolute.split(path.sep);
  if (
    parts.some(
      (part) =>
        part.startsWith(".") ||
        /(?:^|[-_.])(secrets?|credentials?|tokens?|passwords?|private[-_]?keys?)(?:[-_.]|$)/i.test(part),
    )
  )
    throw new Error("Hidden, environment, credential, and secret files are refused.");
  const extension = path.extname(absolute).toLowerCase();
  if (![".html", ".htm", ".md", ".markdown"].includes(extension)) throw new Error("Select an HTML or Markdown file.");
  if ((await realpath(absolute)) !== absolute) throw new Error("Symbolic link paths are refused.");
  const handle = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile() || metadata.size > MAX_BYTES) throw new Error("Select a regular file up to 2 MiB.");
    const bytes = Buffer.alloc(MAX_BYTES + 1);
    let length = 0;
    while (length < bytes.length) {
      const { bytesRead } = await handle.read(bytes, length, bytes.length - length, length);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    if (length > MAX_BYTES) throw new Error("Report exceeds the 2 MiB client limit.");
    const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, length));
    const report: Report = { content, format: [".md", ".markdown"].includes(extension) ? "markdown" : "html" };
    validateReport(report);
    return report;
  } finally {
    await handle.close();
  }
}

export function readerLink(value: unknown): string {
  if (typeof value !== "string") throw new Error("BrewPage returned an invalid reader link.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("BrewPage returned an invalid reader link.");
  }
  if (
    url.protocol !== "https:" ||
    !(url.hostname === "brewpage.app" || /^[a-z0-9-]+\.brewpage\.app$/.test(url.hostname)) ||
    RESERVED_HOST_LABELS.has(url.hostname.replace(/\.brewpage\.app$/, "")) ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !(url.hostname === "brewpage.app"
      ? /^\/[a-z0-9-]{1,32}\/[A-Za-z0-9]{10}$/.test(url.pathname)
      : url.pathname === "/" && /^(?:[a-z0-9-]{1,33}-)?[a-z0-9]{10}\.brewpage\.app$/.test(url.hostname))
  )
    throw new Error("BrewPage returned an unsafe reader link.");
  return url.href;
}

export function createPublisher(fetcher: typeof fetch, origin = ORIGIN) {
  const endpoint = new URL(origin);
  if (origin !== ORIGIN && !(endpoint.protocol === "http:" && endpoint.hostname === "127.0.0.1"))
    throw new Error("Only BrewPage HTTPS or a local protocol fixture is allowed.");
  return async (report: Report, choices: Choices, options: Options): Promise<Publication | undefined> => {
    validateChoices(choices);
    validateReport(report);
    if (!(await options.confirm())) return undefined;
    const url = new URL("/api/html", endpoint);
    if (choices.visibility === "public") url.searchParams.set("ns", "public");
    url.searchParams.set("ttl", "15");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (choices.protection === "password") headers["X-Password"] = choices.password!;
    let response: Response;
    try {
      response = await fetcher(url, {
        method: "POST",
        headers,
        body: JSON.stringify(report),
        redirect: "error",
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      throw new Error("Connection failed. Publication may have succeeded; check before trying again.");
    }
    if (!response.ok)
      throw new Error(`BrewPage refused publication (HTTP ${response.status}). No automatic retry was made.`);
    let data: Record<string, unknown>;
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      throw new Error("Invalid BrewPage response; publication may have succeeded.");
    }
    if (typeof data.id !== "string" || typeof data.namespace !== "string")
      throw new Error("Incomplete BrewPage response; publication may have succeeded.");
    const link = readerLink(data.link);
    if (
      typeof data.expiresAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(data.expiresAt) ||
      !Number.isFinite(Date.parse(data.expiresAt))
    )
      throw new Error("Invalid expiry in BrewPage response.");
    const expiresAt = new Date(data.expiresAt).toISOString();
    if (expiresAt.slice(0, 19) !== data.expiresAt.slice(0, 19)) throw new Error("Invalid expiry in BrewPage response.");
    const result = data.result as { action?: unknown; extras?: { isOwner?: unknown } } | undefined;
    const nonOwnedMerge = result?.action === "merged" && result.extras?.isOwner === false;
    const publication: Publication = { link, expiresAt, id: data.id, namespace: data.namespace };
    if (!nonOwnedMerge) {
      if (typeof data.ownerToken !== "string" || !data.ownerToken || typeof data.ownerLink !== "string")
        throw new Error("Incomplete BrewPage response; publication may have succeeded.");
      const key = `publication:${data.namespace}:${data.id}`;
      const owner: Owner = {
        ownerToken: data.ownerToken,
        ownerLink: data.ownerLink,
        ...(typeof data.manageUrl === "string" ? { manageUrl: data.manageUrl } : {}),
        ...(typeof data.managementLink === "string" ? { managementLink: data.managementLink } : {}),
      };
      const saveOwner = async () => {
        try {
          await options.saveOwner(key, owner);
        } catch {
          throw new Error("Owner access could not be saved. Keep this window open and retry saving.");
        }
      };
      try {
        await saveOwner();
      } catch {
        publication.retryOwnerStorage = saveOwner;
      }
    }
    return publication;
  };
}
