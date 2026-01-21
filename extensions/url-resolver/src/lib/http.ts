import http from "node:http";
import https from "node:https";
import type { FetchResult } from "../types";

// Custom fetch that supports SNI for IP-based requests
const httpsAgent = new https.Agent({ keepAlive: true });
const httpAgent = new http.Agent({ keepAlive: true });

export function fetchWithSNI(
  url: string,
  ip: string | null,
  originalHostname: string,
  timeoutMs: number
): Promise<FetchResult> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === "https:";
    const port = urlObj.port || (isHttps ? 443 : 80);

    const options: https.RequestOptions = {
      hostname: ip || urlObj.hostname,
      port,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      timeout: timeoutMs,
      agent: isHttps ? httpsAgent : httpAgent,
      headers: {
        Host: originalHostname,
        "User-Agent": "Cloudflare-DNS-Resolver/2.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        DNT: "1",
        "Cache-Control": "no-cache",
      },
    };

    // Set SNI for HTTPS to match the original hostname
    if (isHttps && ip) {
      options.servername = originalHostname;
    }

    const protocol = isHttps ? https : http;
    const req = protocol.request(options, (res) => {
      resolve({
        status: res.statusCode ?? 0,
        statusText: res.statusMessage ?? "",
        headers: res.headers,
      });
      res.resume(); // Drain the response
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout after ${timeoutMs}ms`));
    });

    req.end();
  });
}
