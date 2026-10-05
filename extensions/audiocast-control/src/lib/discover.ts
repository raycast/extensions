import { createConnection } from "node:net";
import tls from "node:tls";
import { Bonjour } from "bonjour-service";
import { createLog } from "./debug";
import { cache } from "./cache";
import { AbortedError } from "./aborted";

const log = createLog("discover");

export class DeviceNotFoundError extends Error {
  constructor() {
    super("Device not found!");
  }
}

interface LinkPlayDevice {
  name: string;
  host?: string;
  protocol?: "http" | "https";
  url: string;
  upnpPort?: number;
}

const DISCOVERY_TIMEOUT = 5000;

/**
 * Returns player URL (protocol + hostname):
 * 1. Get URL from cache and check if player is available
 * 2. Try to find player in local network using mDNS
 */
export async function getDeviceUrl(abortSignal?: AbortSignal): Promise<string> {
  log.log(`cached device URL: ${cache.deviceUrl || "EMPTY"}`);

  if (cache.deviceUrl) {
    const availability = await isDeviceAvailable(cache.deviceUrl, undefined, abortSignal);

    if (availability === true) {
      log.log("cached device URL is available");

      return cache.deviceUrl;
    }
  }

  log.log("cached device URL is NOT available, starting discovery");

  const { url, name, upnpPort } = await findDevice(abortSignal);

  cache.deviceUrl = url;
  cache.deviceName = name;

  if (upnpPort) {
    cache.deviceUpnpPort = upnpPort;
  }

  return cache.deviceUrl;
}

/**
 * Find LinkPlay device using mDNS discovery
 * @param {AbortSignal} [signal] - AbortController signal to stop discovery
 * @returns {Promise<LinkPlayDevice>} Device URL (protocol + hostname, e.g., 'https://device.local')
 */
async function findDevice(signal?: AbortSignal): Promise<LinkPlayDevice> {
  log.log("searching for LinkPlay device using mDNS");

  const device = await discoverDevice(DISCOVERY_TIMEOUT, signal);

  if (!device) {
    throw new DeviceNotFoundError();
  }

  const protocol = await detectProtocol(device.host, signal);

  if (!protocol) {
    throw new DeviceNotFoundError();
  }

  if (protocol === "https") {
    const cert = await fetchDeviceCert(device.host, signal);

    if (cert) {
      cache.deviceCert = cert;
      log.log(`device certificate saved (${cert.length} bytes)`);
    }
  }

  log.log(`device found: ${device.name} at ${protocol}://${device.host}`);

  return {
    ...device,
    protocol,
    url: `${protocol}://${device.host}`,
    upnpPort: device.upnpPort,
  };
}

/**
 * Find LinkPlay device using mDNS browser
 * @param {AbortSignal} [signal] - AbortController signal to stop discovery
 * @param {number} [timeout] - Discovery timeout in milliseconds
 * @returns {Promise<{ host: string; name: string; upnpPort?: number } | null>} Discovered device
 */
async function discoverDevice(
  timeout: number,
  signal?: AbortSignal,
): Promise<{ host: string; name: string; upnpPort?: number } | null> {
  return new Promise((resolve, reject) => {
    const bonjour = new Bonjour();
    let resolved = false;

    log.log("starting mDNS browser for _linkplay._tcp service");

    const browser = bonjour.find({ type: "linkplay" }, (service) => {
      if (resolved) {
        return;
      }

      const { host, name = "AudioCast", port } = service;

      log.log(`found LinkPlay service: ${name} at ${host}:${port}`);

      resolved = true;
      browser.stop();
      bonjour.destroy();

      resolve({
        name,
        host,
        upnpPort: port,
      });
    });

    // Timeout handling
    const timeoutId = setTimeout(() => {
      if (resolved) {
        return;
      }

      resolved = true;
      browser.stop();
      bonjour.destroy();

      log.log("timeout reached");

      resolve(null);
    }, timeout);

    // Abort signal handling
    signal?.addEventListener("abort", () => {
      if (resolved) {
        return;
      }

      resolved = true;
      clearTimeout(timeoutId);

      browser.stop();
      bonjour.destroy();

      log.log("aborted");

      reject(new AbortedError());
    });
  });
}

async function fetchDeviceCert(host: string, signal?: AbortSignal): Promise<string | null> {
  log.log(`fetching device certificate from ${host}:443`);

  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host,
      port: 443,
      rejectUnauthorized: false,
      timeout: DISCOVERY_TIMEOUT,
    });

    socket.on("secureConnect", () => {
      const cert = socket.getPeerCertificate(false);
      socket.end();

      if (cert.raw) {
        const der = cert.raw.toString("base64");
        const pem = `-----BEGIN CERTIFICATE-----\n${der.match(/.{1,64}/g)!.join("\n")}\n-----END CERTIFICATE-----\n`;
        const servername =
          cert.subjectaltname
            ?.split(", ")
            .find((entry) => entry.startsWith("DNS:"))
            ?.slice(4) || String(cert.subject?.CN || "");

        if (servername) {
          cache.deviceServername = servername;
        }

        resolve(pem);
      } else {
        log.log("no certificate received");
        resolve(null);
      }
    });

    socket.on("error", (err) => {
      socket.destroy();
      log.log(`failed to fetch certificate: ${err.message}`);
      resolve(null);
    });

    socket.on("timeout", () => {
      socket.destroy();
      log.log("certificate fetch timeout");
      resolve(null);
    });

    signal?.addEventListener("abort", () => {
      socket.destroy();
      reject(new AbortedError());
    });
  });
}

/**
 * Detect which protocol (http or https) is available on the device
 * @param {string} host - Device host or IP address
 * @param {AbortSignal} [signal] - AbortController signal to stop checking
 * @returns {Promise<'http' | 'https' | null>} The available protocol
 */
async function detectProtocol(host: string, signal?: AbortSignal): Promise<"http" | "https" | null> {
  log.log(`searching protocol for host: ${host}`);
  const httpsWorks = await isDeviceAvailable(host, 443, signal);

  if (httpsWorks) {
    log.log("https protocol is available");

    return "https";
  }

  const httpWorks = await isDeviceAvailable(host, 80, signal);

  if (httpWorks) {
    log.log("http protocol is available");

    return "http";
  }

  return null;
}

/**
 * Check whether the device is available by testing TCP connection
 * @param {string} deviceUrlHost - Device URL (e.g., 'http://device.local') or Hostname
 * @param {number} [devicePort] - Port number to check
 * @param {AbortSignal} [signal] - AbortController signal to stop checking
 * @returns {Promise<boolean>} True - if device is available, False - otherwise
 */
async function isDeviceAvailable(deviceUrlHost: string, devicePort?: number, signal?: AbortSignal): Promise<boolean> {
  const isUrl = deviceUrlHost.startsWith("http://") || deviceUrlHost.startsWith("https://");
  const host = isUrl ? new URL(deviceUrlHost).hostname : deviceUrlHost;
  const port = devicePort ?? (isUrl ? (new URL(deviceUrlHost).protocol === "https:" ? 443 : 80) : 80);
  log.log(`checking device at ${host}:${port}`);

  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port, timeout: DISCOVERY_TIMEOUT });

    socket.on("connect", () => {
      log.log(`available on ${host}:${port}`);
      socket.end();
      resolve(true);
    });

    socket.on("error", (error) => {
      log.log(`NOT available on ${host}:${port}: ${error.message}`);
      resolve(false);
    });

    socket.on("timeout", () => {
      log.log(`connection timeout on ${host}:${port}`);
      socket.destroy();
      resolve(false);
    });

    signal?.addEventListener("abort", () => {
      log.log(`aborted for ${host}:${port}`);
      socket.destroy();
      reject(new AbortedError());
    });
  });
}
