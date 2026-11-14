import dgram from "node:dgram";
import { isIP } from "node:net";
import { networkInterfaces } from "node:os";
import { RokuClient } from "./roku";
import type { RokuDevice } from "./types";

const SEARCH = Buffer.from(
  ["M-SEARCH * HTTP/1.1", "HOST: 239.255.255.250:1900", 'MAN: "ssdp:discover"', "MX: 1", "ST: roku:ecp", "", ""].join(
    "\r\n",
  ),
);

/** Exported for fixture testing; accepts only actual Roku ECP discovery replies. */
export function parseSsdpResponse(message: string): { host: string; id?: string } | undefined {
  if (message.length > 16_384) return undefined;
  const [status, ...lines] = message.split(/\r?\n/);
  if (!/^HTTP\/1\.[01]\s+200(?:\s|$)/i.test(status)) return undefined;
  const headers: Record<string, string> = {};
  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator !== -1) headers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
  }
  if (headers.st?.toLowerCase() !== "roku:ecp" || !headers.location) return undefined;
  try {
    const url = new URL(headers.location);
    if (
      url.protocol !== "http:" ||
      url.username ||
      url.password ||
      url.port !== "8060" ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      isIP(url.hostname) !== 4
    )
      return undefined;
    return { host: url.hostname, id: headers.usn?.replace(/^uuid:roku:ecp:/i, "") };
  } catch {
    return undefined;
  }
}

/** Multicast discovery only. A manually entered address remains the fallback. */
export async function discoverRokus(options: { timeoutMs?: number } = {}): Promise<RokuDevice[]> {
  const requestedTimeout = options.timeoutMs ?? 2500;
  const timeoutMs = Number.isFinite(requestedTimeout) ? Math.max(250, Math.min(requestedTimeout, 15_000)) : 2500;
  const interfaces = [
    ...new Set(
      Object.values(networkInterfaces()).flatMap((entries) =>
        (entries ?? []).filter((entry) => entry.family === "IPv4" && !entry.internal).map((entry) => entry.address),
      ),
    ),
  ];
  if (!interfaces.length) return [];
  const foundHosts = new Set<string>();
  await Promise.all(
    interfaces.map(
      (address) =>
        new Promise<void>((resolve) => {
          const socket = dgram.createSocket("udp4");
          let finished = false;
          const finish = () => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            try {
              socket.close();
            } catch {
              /* Socket can fail before binding. */
            }
            resolve();
          };
          const timer = setTimeout(finish, timeoutMs);
          socket.on("error", finish);
          socket.on("message", (message, sender) => {
            const response = parseSsdpResponse(message.toString("utf8"));
            if (response && response.host === sender.address) foundHosts.add(response.host);
          });
          socket.bind(0, address, () => {
            if (finished) return;
            try {
              socket.setMulticastInterface(address);
              socket.setMulticastTTL(2);
              socket.send(SEARCH, 1900, "239.255.255.250", (error) => {
                if (error) finish();
              });
            } catch {
              finish();
            }
          });
        }),
    ),
  );
  const devices = new Map<string, RokuDevice>();
  // Bound the entire identity phase, not each of potentially many batches.
  const deadline = Date.now() + 1800;
  const entries = [...foundHosts].slice(0, 64);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, entries.length) }, async () => {
      while (next < entries.length) {
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0) return;
        const host = entries[next++];
        try {
          const device = await new RokuClient(host, { timeoutMs: remainingMs }).getDeviceInfo();
          if (!devices.has(device.id)) devices.set(device.id, device);
        } catch {
          /* A sleeping or disappearing device can be added manually. */
        }
      }
    }),
  );
  return [...devices.values()].sort((a, b) => a.name.localeCompare(b.name));
}
