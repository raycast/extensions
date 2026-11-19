import http from "node:http";
import https from "node:https";
import { computeMediaBudget } from "./media-budget";
import { PlaybackProbeResult } from "./types";

export interface RangeSource {
  url: string;
  stats: {
    bytes: number;
    requests: number;
    totalBytes?: number;
    cachedBytes?: number;
    ranges: Array<{ start: number; atMs: number }>;
    uniqueRanges: number;
  };
  error(): string | undefined;
  markLocated(): void;
  close(): Promise<void>;
}

/** FFmpeg probes a stream with open-ended requests ("bytes=0-", "bytes=36-").
 * Forwarding those verbatim made every probe read the rest of the file: on a
 * 161 GB source one captured frame transferred 1719 MiB. Clamp every upstream
 * window to a bounded length so a probe costs one window instead of the tail.
 */
const PROBE_WINDOW = 8 * 1024 * 1024;
const STREAM_WINDOW = 32 * 1024 * 1024;

/** All remote screenshot bytes pass this gate, including demuxer seek/probe traffic. */
export async function openRangeSource(
  target: string,
  initialProbe?: Pick<PlaybackProbeResult, "sizeBytes" | "bitrateBps" | "durationSec" | "isRemote">,
): Promise<RangeSource> {
  const stats: RangeSource["stats"] = {
    bytes: 0,
    requests: 0,
    totalBytes: initialProbe?.sizeBytes,
    cachedBytes: 0,
    ranges: [],
    uniqueRanges: 0,
  };
  const seen = new Set<number>();
  const started = Date.now();
  const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 8 });
  const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 8 });

  let budget = computeMediaBudget(initialProbe ?? { isRemote: true });
  let maxRequests = budget.maxRangeRequests;
  let maxBytes = budget.maxRangeBytes;
  let locateTimeoutMs = budget.locateTimeoutMs;
  let socketIdleMs = budget.socketIdleTimeoutMs;
  let lastServedEnd = -1;

  let failure: string | undefined;
  let located = false;
  let locateTimer: ReturnType<typeof setTimeout> | undefined;
  const clients = new Set<http.ClientRequest>();
  const replies = new Set<http.ServerResponse>();
  const fail = (reason: string) => {
    failure ||= reason;
    for (const req of clients) req.destroy();
    for (const res of replies) res.destroy();
  };
  const resetLocateTimer = (timeoutMs: number) => {
    if (located) return;
    if (locateTimer) clearTimeout(locateTimer);
    const remaining = Math.max(15_000, timeoutMs - (Date.now() - started));
    locateTimer = setTimeout(() => {
      if (!located) {
        fail(
          `Seeking took longer than ${Math.round(timeoutMs / 1000)} seconds without finding the target position. Reading stopped.`,
        );
      }
    }, remaining);
  };

  const server = http.createServer((req, res) => {
    replies.add(res);
    res.once("close", () => replies.delete(res));
    if (failure || req.url !== "/media" || !["GET", "HEAD"].includes(req.method || "")) {
      res.writeHead(403);
      res.end();
      return;
    }
    const range = req.headers.range || "bytes=0-";
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) {
      res.writeHead(416);
      res.end();
      return;
    }
    const start = Number(match[1]);
    const askedEnd = match[2] ? Number(match[2]) : undefined;
    const sequential = start === lastServedEnd + 1;
    const window = sequential ? STREAM_WINDOW : PROBE_WINDOW;

    const send = (url: URL, redirects = 0) => {
      seen.add(start);
      stats.uniqueRanges = seen.size;
      stats.ranges.push({ start, atMs: Date.now() - started });
      if (++stats.requests > maxRequests) {
        fail(
          `More than ${maxRequests} range requests were made. Reading stopped without falling back to a full-file scan.`,
        );
        return;
      }
      if (!["http:", "https:"].includes(url.protocol)) {
        fail("The redirect isn't an HTTP/HTTPS URL.");
        return;
      }

      // Clamp an open-ended upstream request; never pull the rest of the file.
      const upstreamStart = start;
      const knownTotal = stats.totalBytes;
      let upstreamEnd = askedEnd !== undefined ? askedEnd : start + window - 1;
      if (knownTotal && knownTotal > 0) upstreamEnd = Math.min(upstreamEnd, knownTotal - 1);
      if (upstreamEnd < upstreamStart) {
        res.writeHead(416, knownTotal ? { "Content-Range": `bytes */${knownTotal}` } : undefined);
        res.end();
        return;
      }
      const upstream = (url.protocol === "https:" ? https : http).request(
        url,
        {
          agent: url.protocol === "https:" ? httpsAgent : httpAgent,
          method: req.method,
          headers: { Range: `bytes=${upstreamStart}-${upstreamEnd}`, "Accept-Encoding": "identity" },
        },
        (response) => {
          if ([301, 302, 303, 307, 308].includes(response.statusCode || 0) && response.headers.location) {
            response.destroy();
            if (redirects >= 5) {
              fail("The video redirected too many times.");
              return;
            }
            send(new URL(response.headers.location, url), redirects + 1);
            return;
          }
          const returnedRange = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(String(response.headers["content-range"] || ""));
          if (response.statusCode !== 206 || !returnedRange || Number(returnedRange[1]) !== upstreamStart) {
            response.destroy();
            fail(
              `The video server didn't return a valid byte-range response (HTTP ${response.statusCode}), so fast seeking isn't possible.`,
            );
            return;
          }
          const total = Number(returnedRange[3]);
          if (Number.isFinite(total) && total > 0 && (!stats.totalBytes || total > stats.totalBytes)) {
            stats.totalBytes = total;
            budget = computeMediaBudget(initialProbe, total);
            maxRequests = Math.max(maxRequests, budget.maxRangeRequests);
            maxBytes = Math.max(maxBytes, budget.maxRangeBytes);
            socketIdleMs = Math.max(socketIdleMs, budget.socketIdleTimeoutMs);
            if (budget.locateTimeoutMs > locateTimeoutMs) {
              locateTimeoutMs = budget.locateTimeoutMs;
              resetLocateTimer(locateTimeoutMs);
            }
          }
          const type = String(response.headers["content-type"] || "");
          if (/html|json|xml/i.test(type)) {
            response.destroy();
            fail("The video URL returned text instead of media.");
            return;
          }
          const bodyEnd = Number(returnedRange[2]);
          res.writeHead(206, {
            "Content-Range": response.headers["content-range"]!,
            "Accept-Ranges": "bytes",
            ...(response.headers["content-length"] ? { "Content-Length": response.headers["content-length"] } : {}),
            "Content-Type": type || "application/octet-stream",
          });
          lastServedEnd = bodyEnd;

          response.on("data", (chunk: Buffer) => {
            stats.bytes += chunk.length;
            if (stats.bytes > maxBytes) {
              response.destroy();
              fail(
                `This capture read more than ${Math.round(maxBytes / 1048576)} MiB. Reading stopped without falling back to a full download.`,
              );
              return;
            }
            if (!res.write(chunk)) response.pause();
          });
          res.on("drain", () => response.resume());
          response.on("end", () => res.end());
          response.on("error", () => res.destroy());
        },
      );
      let retrying = false;
      clients.add(upstream);
      upstream.once("close", () => clients.delete(upstream));
      upstream.once("error", () => {
        if (!retrying && !res.destroyed) res.destroy();
      });
      upstream.setTimeout(socketIdleMs, () => {
        if (!res.headersSent && !res.destroyed && !failure && redirects < 2) {
          retrying = true;
          upstream.destroy();
          send(url, redirects + 1);
        } else {
          fail(`No video data for ${Math.round(socketIdleMs / 1000)} seconds, and retrying didn't help.`);
        }
      });
      res.once("close", () => upstream.destroy());
      upstream.end();
    };
    send(new URL(target));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Couldn't create the local video read channel");
  resetLocateTimer(locateTimeoutMs);
  return {
    url: `http://127.0.0.1:${address.port}/media`,
    stats,
    error: () => failure,
    markLocated: () => {
      located = true;
      if (locateTimer) clearTimeout(locateTimer);
    },
    close: async () => {
      if (locateTimer) clearTimeout(locateTimer);
      for (const request of clients) request.destroy();
      httpAgent.destroy();
      httpsAgent.destroy();
      for (const reply of replies) reply.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
