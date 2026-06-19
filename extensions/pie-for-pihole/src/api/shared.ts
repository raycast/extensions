import http from "http";
import https from "https";

export class PiholeConnectionError extends Error {
  readonly cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "PiholeConnectionError";
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

// Per-request TLS bypass for Pi-hole v6's self-signed certificate.
// Using https.Agent scopes the bypass to Pi-hole connections only,
// without touching process-wide env vars.
const insecureAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB

class AbortError extends Error {
  override name = "AbortError";
}

export async function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const isHttps = url.startsWith("https:");

    const response = await new Promise<Response>((resolve, reject) => {
      let settled = false;
      const safeResolve = (value: Response) => {
        if (!settled) {
          settled = true;
          resolve(value);
        }
      };
      const safeReject = (reason: unknown) => {
        if (!settled) {
          settled = true;
          reject(reason);
        }
      };

      const parsedUrl = new URL(url);
      const transport = isHttps ? https : http;

      const reqOptions: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: options?.method || "GET",
        headers: options?.headers as Record<string, string>,
        ...(isHttps ? { agent: insecureAgent } : {}),
      };

      const req = transport.request(reqOptions, (res) => {
        const chunks: Buffer[] = [];
        let totalBytes = 0;

        res.on("data", (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes > MAX_RESPONSE_BYTES) {
            res.destroy(new Error("Response too large"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("error", safeReject);
        res.on("end", () => {
          // Buffer.concat expects Uint8Array[] in TS5, Response expects BodyInit.
          // Both are compatible at runtime; cast through unknown for strict types.
          const raw = Buffer.concat(chunks as unknown as Uint8Array[]);
          const headers = new Headers();
          for (const [key, value] of Object.entries(res.headers)) {
            if (value) {
              const values = Array.isArray(value) ? value : [value];
              for (const v of values) {
                headers.append(key, v);
              }
            }
          }
          safeResolve(
            new Response(raw as unknown as BodyInit, {
              status: res.statusCode ?? 200,
              statusText: res.statusMessage ?? "",
              headers,
            }),
          );
        });

        // Abort must also destroy the response stream to stop buffering
        controller.signal.addEventListener(
          "abort",
          () => {
            res.destroy();
            safeReject(new AbortError("Request aborted"));
          },
          { once: true },
        );
      });

      req.on("error", safeReject);

      const onAbort = () => {
        req.destroy();
        safeReject(new AbortError("Request aborted"));
      };
      controller.signal.addEventListener("abort", onAbort, { once: true });

      // Clean up abort listener after promise settles (not on req.close)
      const cleanup = () => controller.signal.removeEventListener("abort", onAbort);
      req.on("close", cleanup);

      if (options?.body) {
        req.write(options.body);
      }
      req.end();
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof AbortError) {
      throw new PiholeConnectionError("Request timed out. Check your Pi-hole URL.");
    }
    throw new PiholeConnectionError("Failed to connect to Pi-hole. Check your URL and network.", { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

export function formatTimestamp(unixTimestamp: number): string {
  const date = new Date(unixTimestamp * 1000);
  const hours = date.getHours();
  const minutes = "0" + date.getMinutes();
  const seconds = "0" + date.getSeconds();
  return hours + ":" + minutes.slice(-2) + ":" + seconds.slice(-2);
}
