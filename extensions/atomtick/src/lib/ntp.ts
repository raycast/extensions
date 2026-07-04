import dgram from "node:dgram";
import { Cache } from "@raycast/api";

const NTP_PORT = 123;
const NTP_PACKET_SIZE = 48;
const NTP_EPOCH_OFFSET_SECONDS = 2208988800; // seconds between 1900-01-01 and 1970-01-01
const REQUEST_TIMEOUT_MS = 5000;
const CACHE_KEY = "atomtick-ntp-offset-v1";
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000; // resync at most every 6h unless forced

export const NTP_SERVERS = ["time.nist.gov", "pool.ntp.org"] as const;

export interface AtomicOffset {
  /** Milliseconds to add to Date.now() to get the atomic reference time. */
  offsetMs: number;
  /** Local Date.now() timestamp when this offset was measured. */
  syncedAtMs: number;
  /** NTP server that produced this measurement. */
  server: string;
  /** Estimated network round-trip time in milliseconds. */
  roundTripMs: number;
}

const cache = new Cache();

let liveOffset: AtomicOffset | undefined = hydrateFromCache();

function hydrateFromCache(): AtomicOffset | undefined {
  const raw = cache.get(CACHE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as AtomicOffset;
  } catch {
    return undefined;
  }
}

function persist(offset: AtomicOffset) {
  liveOffset = offset;
  cache.set(CACHE_KEY, JSON.stringify(offset));
}

function dateToNtp(msSinceEpoch: number): { seconds: number; fraction: number } {
  const ntpSeconds = msSinceEpoch / 1000 + NTP_EPOCH_OFFSET_SECONDS;
  const seconds = Math.floor(ntpSeconds);
  const fraction = Math.round((ntpSeconds - seconds) * 2 ** 32);
  return { seconds, fraction };
}

function ntpToDate(seconds: number, fraction: number): number {
  return (seconds - NTP_EPOCH_OFFSET_SECONDS) * 1000 + (fraction / 2 ** 32) * 1000;
}

function buildRequestPacket(t1ClientSendMs: number): Buffer {
  const buf = Buffer.alloc(NTP_PACKET_SIZE);
  buf[0] = 0x1b; // LI = 0, VN = 3, Mode = 3 (client)
  const { seconds, fraction } = dateToNtp(t1ClientSendMs);
  buf.writeUInt32BE(seconds, 40);
  buf.writeUInt32BE(fraction, 44);
  return buf;
}

function queryServer(host: string): Promise<AtomicOffset> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.close();
      fn();
    };

    const timer = setTimeout(() => {
      finish(() => reject(new Error(`NTP request to ${host} timed out after ${REQUEST_TIMEOUT_MS}ms`)));
    }, REQUEST_TIMEOUT_MS);

    socket.on("error", (err) => {
      finish(() => reject(err));
    });

    socket.on("message", (msg) => {
      const t4ClientReceiveMs = Date.now();
      finish(() => {
        if (msg.length < NTP_PACKET_SIZE) {
          reject(new Error(`Malformed NTP response from ${host}`));
          return;
        }

        const t1 = ntpToDate(msg.readUInt32BE(24), msg.readUInt32BE(28)); // originate (echoed)
        const t2 = ntpToDate(msg.readUInt32BE(32), msg.readUInt32BE(36)); // server receive
        const t3 = ntpToDate(msg.readUInt32BE(40), msg.readUInt32BE(44)); // server transmit

        const offsetMs = (t2 - t1 + (t3 - t4ClientReceiveMs)) / 2;
        const roundTripMs = t4ClientReceiveMs - t1 - (t3 - t2);

        resolve({ offsetMs, syncedAtMs: t4ClientReceiveMs, server: host, roundTripMs });
      });
    });

    const t1ClientSendMs = Date.now();
    const request = buildRequestPacket(t1ClientSendMs);
    socket.send(request, 0, request.length, NTP_PORT, host, (err) => {
      if (err) finish(() => reject(err));
    });
  });
}

/** Queries the configured NTP servers in order, falling back on failure, and caches the result. */
export async function resync(): Promise<AtomicOffset> {
  let lastError: unknown;
  for (const server of NTP_SERVERS) {
    try {
      const offset = await queryServer(server);
      persist(offset);
      return offset;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All NTP servers unreachable");
}

/** Returns the last known offset, resyncing first if there is none or it has gone stale. */
export async function ensureSynced(): Promise<AtomicOffset> {
  if (liveOffset && Date.now() - liveOffset.syncedAtMs < CACHE_MAX_AGE_MS) {
    return liveOffset;
  }
  return resync();
}

/** Best-effort synchronous snapshot: cached offset if available, else the raw system clock. */
export function getAtomicNow(): number {
  return Date.now() + (liveOffset?.offsetMs ?? 0);
}

export function getLastOffset(): AtomicOffset | undefined {
  return liveOffset;
}
