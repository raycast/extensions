import type { ResolveResult } from "../types";
import { resolveViaDoH } from "./dns";
import { fetchWithSNI } from "./http";
import { debugLog } from "./log";

export function validateUrl(url: string): string {
  if (!url) return "";
  const cleanUrl = url.trim().replace(/[\r\n\t]/g, "");
  if (!cleanUrl.match(/^https?:\/\//)) {
    return `https://${cleanUrl}`;
  }
  return cleanUrl;
}

export async function resolveUrl(
  url: string,
  maxRedirects: number,
  timeout: number,
  provider?: "cloudflare" | "google" | "quad9" | "opendns"
): Promise<ResolveResult> {
  const validatedUrl = validateUrl(url);
  let currentUrl = validatedUrl;
  let redirectCount = 0;
  const trace: string[] = [validatedUrl];

  debugLog(`[Resolve] Starting: ${validatedUrl}`);

  try {
    while (redirectCount < maxRedirects) {
      try {
        const urlObj = new URL(currentUrl);
        const resolvedIp = await resolveViaDoH(urlObj.hostname, 0, provider);

        if (resolvedIp) {
          debugLog(`[Fetch] Using IP ${resolvedIp} for ${urlObj.hostname}`);
        } else {
          debugLog(`[Fetch] No DoH result, using original hostname: ${urlObj.hostname}`);
        }

        debugLog(`[Fetch] GET ${currentUrl}`);
        const response = await fetchWithSNI(currentUrl, resolvedIp, urlObj.hostname, timeout);

        debugLog(`[Fetch] Response: ${response.status} ${response.statusText}`);

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.location;
          const locationStr = Array.isArray(location) ? location[0] : location;
          debugLog(`[Fetch] Location header: ${locationStr}`);
          if (!locationStr) break;

          try {
            if (locationStr.startsWith("http")) {
              currentUrl = locationStr;
            } else if (locationStr.startsWith("/")) {
              const baseUrl = new URL(currentUrl);
              currentUrl = `${baseUrl.origin}${locationStr}`;
            } else {
              currentUrl = new URL(locationStr, currentUrl).href;
            }
            redirectCount++;
            trace.push(currentUrl);
            debugLog(`[Resolve] Redirect ${redirectCount} -> ${currentUrl}`);
          } catch (e) {
            debugLog(`[Resolve] Failed to parse location: ${locationStr}`, e);
            break;
          }
        } else {
          debugLog(`[Resolve] Final status ${response.status}, stopping`);
          break;
        }
      } catch (fetchError) {
        debugLog(`[Fetch] Error:`, fetchError);

        let errorMessage = "Unknown error";
        if (fetchError instanceof Error) {
          if (fetchError.message.includes("Timeout")) {
            errorMessage = fetchError.message;
          } else if (fetchError.message.includes("ENOTFOUND")) {
            errorMessage = "Domain not found";
          } else if (fetchError.message.includes("ECONNREFUSED")) {
            errorMessage = "Connection refused";
          } else {
            errorMessage = fetchError.message;
          }
        }

        const resolvedIp = await resolveViaDoH(new URL(currentUrl).hostname, 0, provider);

        return {
          originalUrl: validatedUrl,
          finalUrl: currentUrl,
          redirectCount,
          trace,
          finalIp: resolvedIp ?? undefined,
          provider,
          error: errorMessage,
        };
      }
    }

    if (redirectCount >= maxRedirects) {
      return {
        originalUrl: validatedUrl,
        finalUrl: currentUrl,
        redirectCount,
        trace,
        error: `Max redirects exceeded (${maxRedirects})`,
      };
    }

    debugLog(`[Resolve] Done: ${currentUrl} (${redirectCount} redirects)`);

    const finalIp = await resolveViaDoH(new URL(currentUrl).hostname, 0, provider);

    return {
      originalUrl: validatedUrl,
      finalUrl: currentUrl,
      redirectCount,
      trace,
      finalIp: finalIp ?? undefined,
      provider,
    };
  } catch (error) {
    debugLog(`[Resolve] Outer error:`, error);
    return {
      originalUrl: validatedUrl,
      finalUrl: currentUrl,
      redirectCount,
      trace,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
