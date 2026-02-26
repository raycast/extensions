import { getPreferenceValues } from "@raycast/api";
import { resolveNs } from "node:dns/promises";
import { CheckResult, SiteStatus } from "./types";

interface Preferences {
  timeout: string;
}

function getTimeoutMs(): number {
  const { timeout } = getPreferenceValues<Preferences>();
  const seconds = parseInt(timeout, 10);
  return (isNaN(seconds) ? 10 : seconds) * 1000;
}

function classifyStatus(statusCode: number): SiteStatus {
  return statusCode >= 500 ? "down" : "up";
}

// Node's fetch wraps errors in TypeError with the real error in .cause
function getRootError(error: unknown): Error | undefined {
  if (!(error instanceof Error)) return undefined;
  let current: Error = error;
  while (current.cause instanceof Error) {
    current = current.cause;
  }
  return current;
}

function isConnectionFailure(error: unknown): boolean {
  const root = getRootError(error);
  if (!root) return false;
  const code = (root as NodeJS.ErrnoException).code;
  const msg = root.message;
  return (
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "ECONNRESET" ||
    root.name === "AbortError" ||
    msg.includes("ENOTFOUND") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ECONNRESET") ||
    msg.includes("aborted") ||
    msg.includes("certificate") ||
    msg.includes("SSL") ||
    msg.includes("TLS")
  );
}

async function isDomainRegistered(hostname: string): Promise<boolean> {
  try {
    const ns = await resolveNs(hostname);
    return ns.length > 0;
  } catch {
    return false;
  }
}

async function isUpGlobally(domain: string): Promise<boolean | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(
        `https://www.isitdownrightnow.com/check.php?domain=${encodeURIComponent(domain)}`,
        { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0" } },
      );
      const html = await res.text();
      if (html.includes("is UP and reachable")) return true;
      if (html.includes("is DOWN")) return false;
      return null;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null; // Can't determine, skip global check
  }
}

function mapErrorMessage(error: unknown): string {
  const root = getRootError(error);
  if (!root) return String(error);

  const msg = root.message;
  const code = (root as NodeJS.ErrnoException).code;

  if (code === "ENOTFOUND" || msg.includes("ENOTFOUND")) {
    return "DNS lookup failed — domain not found";
  }
  if (code === "ECONNREFUSED" || msg.includes("ECONNREFUSED")) {
    return "Connection refused — server not accepting connections";
  }
  if (code === "ECONNRESET" || msg.includes("ECONNRESET")) {
    return "Connection reset by server";
  }
  if (root.name === "AbortError" || msg.includes("aborted")) {
    return "Request timed out";
  }
  if (
    msg.includes("certificate") ||
    msg.includes("SSL") ||
    msg.includes("TLS") ||
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
  ) {
    return `SSL/TLS error: ${msg}`;
  }
  return msg;
}

async function fetchWithMethod(
  url: string,
  method: "HEAD" | "GET",
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Raycast; IsThisWebsiteDown/1.0)",
      },
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkWebsite(url: string): Promise<CheckResult> {
  const timeoutMs = getTimeoutMs();
  const hostname = new URL(url).hostname;
  const start = Date.now();

  try {
    let response: Response;
    try {
      response = await fetchWithMethod(url, "HEAD", timeoutMs);
    } catch {
      // HEAD might be rejected; fall back to GET
      response = await fetchWithMethod(url, "GET", timeoutMs);
    }

    const responseTimeMs = Date.now() - start;
    const status = classifyStatus(response.status);

    return {
      url,
      status,
      statusCode: response.status,
      statusText: response.statusText,
      responseTimeMs,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    const responseTimeMs = Date.now() - start;

    // On connection failure, check domain registration and global status
    if (isConnectionFailure(error)) {
      const [registered, globalUp] = await Promise.all([
        isDomainRegistered(hostname),
        isUpGlobally(hostname),
      ]);

      if (!registered) {
        return {
          url,
          status: "available",
          responseTimeMs,
          errorMessage: "Domain is not registered — may be available to buy",
          checkedAt: new Date().toISOString(),
        };
      }

      if (globalUp === true) {
        return {
          url,
          status: "blocked",
          responseTimeMs,
          errorMessage: "Site is up globally but unreachable from your network",
          checkedAt: new Date().toISOString(),
        };
      }
    }

    return {
      url,
      status: "down",
      responseTimeMs,
      errorMessage: mapErrorMessage(error),
      checkedAt: new Date().toISOString(),
    };
  }
}
