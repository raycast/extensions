import dgram from "node:dgram";
import os from "node:os";
import crypto from "node:crypto";
import { getPreferenceValues } from "@raycast/api";
import { DeviceInfo, LocalSendDevice, PrepareUploadRequest, PrepareUploadResponse, FileMetadata } from "../types";

export const MULTICAST_ADDRESS = "224.0.0.167";
export const MULTICAST_PORT = 53317;
const DEFAULT_HTTP_PORT = 53318;
const PROTOCOL_VERSION = "2.1";

const getPreferences = (): Preferences => {
  try {
    return getPreferenceValues<Preferences>();
  } catch {
    return {
      deviceName: "",
      deviceType: "desktop",
      deviceModel: "",
      httpPort: "53318",
      downloadPath: "~/Downloads",
      enableReceive: false,
      quickSave: "off",
      enableDiscovery: true,
      discoveryTimeout: "5",
      multicastAddress: "224.0.0.167",
      networkInterface: "",
      enableEncryption: false,
    };
  }
};

const getHttpPort = (): number => {
  const prefs = getPreferences();
  const port = parseInt(prefs.httpPort || "53318", 10);
  return isNaN(port) || port < 1024 || port > 65535 ? DEFAULT_HTTP_PORT : port;
};

// Cache for local IPs to prevent UI blinking during refresh
let cachedIPs: string[] = ["0.0.0.0"]; // Start with placeholder

export const getLocalIPs = (): string[] => {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];

  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;

    for (const addr of iface) {
      if (addr.family === "IPv4" && !addr.internal) {
        ips.push(addr.address);
      }
    }
  }

  // Only update cache if we found IPs, otherwise keep showing old ones
  if (ips.length > 0) {
    cachedIPs = ips;
  }

  // Always return cached IPs (which defaults to 0.0.0.0 if nothing found yet)
  return cachedIPs;
};

export const getDeviceInfo = (): DeviceInfo => {
  const prefs = getPreferences();
  const hostname = os.hostname();

  const deviceName = prefs.deviceName || hostname || "Raycast";
  const deviceType = (prefs.deviceType || "desktop") as "mobile" | "desktop" | "web" | "headless";
  const deviceModel = prefs.deviceModel || `${os.type()} ${os.release()}`;

  // Generate deterministic fingerprint from MAC address + hostname
  // This ensures the same fingerprint across all commands in a session
  interface GlobalWithFingerprint {
    __localsend_fingerprint?: string;
  }
  let sessionFingerprint = (global as unknown as GlobalWithFingerprint).__localsend_fingerprint;
  if (!sessionFingerprint) {
    const networkInterfaces = os.networkInterfaces();
    const macAddress =
      Object.values(networkInterfaces)
        .flat()
        .find((iface) => iface && !iface.internal && iface.mac !== "00:00:00:00:00:00")?.mac || hostname;

    sessionFingerprint = crypto
      .createHash("sha256")
      .update(macAddress + hostname)
      .digest("hex")
      .substring(0, 32);
    (global as unknown as GlobalWithFingerprint).__localsend_fingerprint = sessionFingerprint;
  }

  return {
    alias: deviceName,
    version: PROTOCOL_VERSION,
    deviceModel: deviceModel,
    deviceType: deviceType,
    fingerprint: sessionFingerprint,
    port: getHttpPort(),
    protocol: "http",
    download: prefs.enableReceive,
  };
};

export const discoverDevicesMulticast = async (timeout = 5000): Promise<LocalSendDevice[]> =>
  new Promise((resolve) => {
    const devices = new Map<string, LocalSendDevice>();
    const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    const deviceInfo = getDeviceInfo();

    socket.on("error", (err) => {
      console.error("Socket error:", err);
      socket.close();
      resolve(Array.from(devices.values()));
    });

    socket.on("message", (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString()) as DeviceInfo;

        if (data.fingerprint === deviceInfo.fingerprint) {
          return;
        }

        const device: LocalSendDevice = {
          ...data,
          ip: rinfo.address,
          lastSeen: Date.now(),
        };

        devices.set(rinfo.address, device);

        if (data.announce) {
          const response = { ...deviceInfo, announce: false };
          socket.send(JSON.stringify(response), MULTICAST_PORT, MULTICAST_ADDRESS);
        }
      } catch (error) {
        console.error("Error parsing multicast message:", error);
      }
    });

    socket.bind({ port: MULTICAST_PORT, exclusive: false }, () => {
      try {
        socket.addMembership(MULTICAST_ADDRESS);
        socket.setBroadcast(true);

        const announcement = { ...deviceInfo, announce: true };
        const message = Buffer.from(JSON.stringify(announcement));
        socket.send(message, MULTICAST_PORT, MULTICAST_ADDRESS);
      } catch (error) {
        console.error("Error setting up multicast:", error);
      }
    });

    setTimeout(() => {
      socket.close();
      resolve(Array.from(devices.values()));
    }, timeout);
  });

export const discoverDevicesHTTP = async (): Promise<LocalSendDevice[]> => {
  const devices: LocalSendDevice[] = [];
  const localIPs = getLocalIPs();
  const deviceInfo = getDeviceInfo();

  if (localIPs.length === 0) {
    return devices;
  }

  const subnet = localIPs[0].split(".").slice(0, 3).join(".");
  const promises: Promise<void>[] = [];

  const portsToCheck = [53317, 53318, 53319];

  for (let i = 1; i <= 254; i++) {
    const ip = `${subnet}.${i}`;

    if (localIPs.includes(ip)) {
      continue;
    }

    for (const port of portsToCheck) {
      const promise = (async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);

        try {
          const response = await fetch(`http://${ip}:${port}/api/localsend/v2/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(deviceInfo),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = (await response.json()) as DeviceInfo;
            const existingDevice = devices.find((d) => d.ip === ip);
            if (!existingDevice) {
              devices.push({
                ...data,
                ip,
                lastSeen: Date.now(),
              });
            }
          }
        } catch {
          clearTimeout(timeoutId);
        }
      })();

      promises.push(promise);
    }
  }

  await Promise.all(promises);
  return devices;
};

export const getDeviceInfoHTTP = async (ip: string, port: number): Promise<DeviceInfo | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`http://${ip}:${port}/api/localsend/v2/info`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return (await response.json()) as DeviceInfo;
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Error fetching device info:", error);
  }

  return null;
};

export const sendFiles = async (
  device: LocalSendDevice,
  files: Array<{ path: string; name: string; size: number; type: string }>,
  pin?: string,
): Promise<void> => {
  const deviceInfo = getDeviceInfo();
  const fileMetadata: Record<string, FileMetadata> = {};
  const fs = await import("node:fs/promises");
  const crypto = await import("node:crypto");

  for (const file of files) {
    const fileId = crypto.randomBytes(8).toString("hex");

    const stats = await fs.stat(file.path);

    fileMetadata[fileId] = {
      id: fileId,
      fileName: file.name,
      size: file.size,
      fileType: file.type,
      metadata: {
        modified: stats.mtime.toISOString(),
        accessed: stats.atime.toISOString(),
      },
    };
  }

  const prepareRequest: PrepareUploadRequest = {
    info: deviceInfo,
    files: fileMetadata,
  };

  const url = `${device.protocol}://${device.ip}:${device.port}/api/localsend/v2/prepare-upload${pin ? `?pin=${pin}` : ""}`;

  console.log(`Attempting to send to: ${url}`);
  console.log(`Device info:`, JSON.stringify(device, null, 2));

  let prepareResponse;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      prepareResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prepareRequest),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error("Connection error:", error);

    interface FetchError extends Error {
      type?: string;
    }
    if (
      error instanceof Error &&
      (error.message.includes("timeout") || (error as FetchError).type === "request-timeout")
    ) {
      throw new Error(
        `${device.alias} didn't respond within 30 seconds. The device may be waiting for the user to accept a previous transfer, or LocalSend may not be running.`,
      );
    }

    throw new Error(
      `Cannot connect to ${device.alias} (${device.ip}:${device.port}). Make sure LocalSend is running and the device is reachable. Error: ${error instanceof Error ? error.message : "Unknown"}`,
    );
  }

  console.log(`Response status: ${prepareResponse.status}`);

  if (!prepareResponse.ok) {
    if (prepareResponse.status === 401) {
      throw new Error("PIN required or invalid PIN");
    } else if (prepareResponse.status === 403) {
      throw new Error("Transfer rejected by receiver");
    } else if (prepareResponse.status === 409) {
      throw new Error(
        "Device is busy with another transfer. Please wait for the receiver to accept/decline the pending transfer, or try again in a few moments.",
      );
    } else if (prepareResponse.status === 204) {
      return;
    }
    throw new Error(`Failed to prepare upload: ${prepareResponse.status}`);
  }

  const { sessionId, files: fileTokens } = (await prepareResponse.json()) as PrepareUploadResponse;

  try {
    const uploadPromises = Object.entries(fileTokens).map(async ([fileId, token]) => {
      const file = files[Object.keys(fileMetadata).indexOf(fileId)];
      const fileData = await fs.readFile(file.path);

      const uploadUrl = `${device.protocol}://${device.ip}:${device.port}/api/localsend/v2/upload?sessionId=${sessionId}&fileId=${fileId}&token=${token}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          body: fileData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload file ${file.name}: ${uploadResponse.status}`);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    });

    await Promise.all(uploadPromises);
  } catch (error) {
    await cancelSession(device, sessionId);
    throw error;
  }
};

export const cancelSession = async (device: LocalSendDevice, sessionId: string): Promise<void> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      await fetch(`${device.protocol}://${device.ip}:${device.port}/api/localsend/v2/cancel?sessionId=${sessionId}`, {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error("Failed to cancel session:", error);
  }
};
