import { createSocket } from "node:dgram";
import { networkInterfaces } from "node:os";
import { WiiMDevice } from "./types";
import { WiiMAPIError } from "./errors";

export const SSDP_MULTICAST = "239.255.255.250";
export const SSDP_PORT = 1900;
export const DISCOVERY_TIMEOUT_MS = 5000;

// Use ssdp:all so WiiM devices include their schemas-wiimu-com service type,
// which is the most reliable identifier for a WiiM device.
export const SSDP_MSEARCH = [
  "M-SEARCH * HTTP/1.1",
  `HOST: ${SSDP_MULTICAST}:${SSDP_PORT}`,
  'MAN: "ssdp:discover"',
  "MX: 2",
  "ST: ssdp:all",
  "",
  "",
].join("\r\n");

/**
 * Extracts IP from an SSDP response if it is positively identified as a WiiM device.
 * WiiM devices include "schemas-wiimu-com" in one of their ST responses when
 * queried with ssdp:all.
 */
function extractWiiMIP(response: string): string | null {
  const locationMatch = response.match(/LOCATION:\s*http:\/\/(\d+\.\d+\.\d+\.\d+)[:/]/i);
  if (!locationMatch) return null;
  if (/schemas-wiimu-com/i.test(response)) {
    return locationMatch[1];
  }
  return null;
}

/**
 * Returns the first non-loopback IPv4 address of this machine.
 * Used to bind the discovery socket to the correct network interface.
 */
export function getLocalIP(): string | undefined {
  const ifaces = networkInterfaces();
  for (const addrs of Object.values(ifaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) {
        return addr.address;
      }
    }
  }
  return undefined;
}

/**
 * Returns the local network subnet (e.g., "192.168.1.0").
 * Used for diagnostics only.
 */
export function getLocalSubnet(): string | undefined {
  const ip = getLocalIP();
  if (!ip) return undefined;
  const parts = ip.split(".");
  return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
}

/**
 * Sends an SSDP M-SEARCH and resolves with the first confirmed WiiM device.
 * Binds to the local network interface so the multicast packet is routed correctly.
 */
export function broadcastDiscover(): Promise<WiiMDevice> {
  return new Promise((resolve, reject) => {
    const socket = createSocket("udp4");
    let settled = false;

    function settle(fn: () => void) {
      if (settled) return;
      settled = true;
      try {
        socket.close();
      } catch {
        /* ignore */
      }
      fn();
    }

    const timer = setTimeout(() => {
      settle(() =>
        reject(
          new WiiMAPIError(
            "DISCOVERY_FAILED",
            "No WiiM device found on network. Try setting the IP address manually in extension preferences.",
          ),
        ),
      );
    }, DISCOVERY_TIMEOUT_MS);

    socket.on("message", (msg) => {
      const response = msg.toString("utf-8");
      const ip = extractWiiMIP(response);
      if (ip) {
        clearTimeout(timer);
        settle(() => resolve({ ip, port: 443 }));
      }
    });

    socket.on("error", (err) => {
      clearTimeout(timer);
      settle(() => reject(new WiiMAPIError("DISCOVERY_FAILED", `Socket error: ${err.message}`, undefined, err)));
    });

    const localIP = getLocalIP();

    socket.bind(0, localIP ?? undefined, () => {
      socket.setBroadcast(true);
      const packet = Buffer.from(SSDP_MSEARCH);
      socket.send(packet, 0, packet.length, SSDP_PORT, SSDP_MULTICAST, (err) => {
        if (err) {
          clearTimeout(timer);
          settle(() => reject(new WiiMAPIError("DISCOVERY_FAILED", `Send error: ${err.message}`, undefined, err)));
        }
      });
    });
  });
}

/**
 * Sends an SSDP M-SEARCH and collects all WiiM devices found within the timeout.
 * Returns an array of unique devices by IP address.
 */
export function broadcastDiscoverAll(): Promise<WiiMDevice[]> {
  return new Promise((resolve, reject) => {
    const socket = createSocket("udp4");
    const foundIPs = new Set<string>();
    let settled = false;

    function settle(fn: () => void) {
      if (settled) return;
      settled = true;
      try {
        socket.close();
      } catch {
        /* ignore */
      }
      fn();
    }

    const timer = setTimeout(() => {
      settle(() => {
        const devices = Array.from(foundIPs).map((ip) => ({ ip, port: 443 }));
        if (devices.length === 0) {
          reject(
            new WiiMAPIError(
              "DISCOVERY_FAILED",
              "No WiiM device found on network. Try setting the IP address manually in extension preferences.",
            ),
          );
        } else {
          resolve(devices);
        }
      });
    }, DISCOVERY_TIMEOUT_MS);

    socket.on("message", (msg) => {
      const response = msg.toString("utf-8");
      const ip = extractWiiMIP(response);
      if (ip) {
        foundIPs.add(ip);
      }
    });

    socket.on("error", (err) => {
      clearTimeout(timer);
      settle(() => reject(new WiiMAPIError("DISCOVERY_FAILED", `Socket error: ${err.message}`, undefined, err)));
    });

    const localIP = getLocalIP();

    socket.bind(0, localIP ?? undefined, () => {
      socket.setBroadcast(true);
      const packet = Buffer.from(SSDP_MSEARCH);
      socket.send(packet, 0, packet.length, SSDP_PORT, SSDP_MULTICAST, (err) => {
        if (err) {
          clearTimeout(timer);
          settle(() => reject(new WiiMAPIError("DISCOVERY_FAILED", `Send error: ${err.message}`, undefined, err)));
        }
      });
    });
  });
}
