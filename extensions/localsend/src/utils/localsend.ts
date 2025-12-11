import dgram from "node:dgram";
import os from "node:os";
import crypto from "node:crypto";
import fetch from "node-fetch";
import { DeviceInfo, LocalSendDevice, PrepareUploadRequest, PrepareUploadResponse } from "../types";

const MULTICAST_ADDRESS = "224.0.0.167";
const MULTICAST_PORT = 53317;
const HTTP_PORT = 53317;
const PROTOCOL_VERSION = "2.1";

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

  return ips;
};

export const getDeviceInfo = (): DeviceInfo => ({
  alias: os.hostname() || "Raycast",
  version: PROTOCOL_VERSION,
  deviceModel: os.platform(),
  deviceType: "desktop",
  fingerprint: crypto.randomBytes(16).toString("hex"),
  port: HTTP_PORT,
  protocol: "http",
  download: false,
});

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

    socket.bind(MULTICAST_PORT, () => {
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

  for (let i = 1; i <= 254; i++) {
    const ip = `${subnet}.${i}`;

    if (localIPs.includes(ip)) {
      continue;
    }

    const promise = (async () => {
      try {
        const response = await fetch(`http://${ip}:${HTTP_PORT}/api/localsend/v2/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(deviceInfo),
          timeout: 1000,
        });

        if (response.ok) {
          const data = (await response.json()) as DeviceInfo;
          devices.push({
            ...data,
            ip,
            lastSeen: Date.now(),
          });
        }
      } catch {
        // Ignore timeout errors
      }
    })();

    promises.push(promise);
  }

  await Promise.all(promises);
  return devices;
};

export const getDeviceInfoHTTP = async (ip: string, port: number): Promise<DeviceInfo | null> => {
  try {
    const response = await fetch(`http://${ip}:${port}/api/localsend/v2/info`, {
      timeout: 3000,
    });

    if (response.ok) {
      return (await response.json()) as DeviceInfo;
    }
  } catch (error) {
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

  for (const file of files) {
    const fileId = crypto.randomBytes(8).toString("hex");
    fileMetadata[fileId] = {
      id: fileId,
      fileName: file.name,
      size: file.size,
      fileType: file.type,
    };
  }

  const prepareRequest: PrepareUploadRequest = {
    info: deviceInfo,
    files: fileMetadata,
  };

  const url = `${device.protocol}://${device.ip}:${device.port}/api/localsend/v2/prepare-upload${pin ? `?pin=${pin}` : ""}`;

  let prepareResponse;
  try {
    prepareResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prepareRequest),
      timeout: 10000,
    });
  } catch {
    throw new Error(
      `Cannot connect to ${device.alias} (${device.ip}). Make sure LocalSend is running and the device is reachable.`,
    );
  }

  if (!prepareResponse.ok) {
    if (prepareResponse.status === 401) {
      throw new Error("PIN required or invalid PIN");
    } else if (prepareResponse.status === 403) {
      throw new Error("Transfer rejected by receiver");
    } else if (prepareResponse.status === 409) {
      throw new Error("Blocked by another session");
    }
    throw new Error(`Failed to prepare upload: ${prepareResponse.status}`);
  }

  const { sessionId, files: fileTokens } = (await prepareResponse.json()) as PrepareUploadResponse;

  const fs = await import("node:fs/promises");
  const uploadPromises = Object.entries(fileTokens).map(async ([fileId, token]) => {
    const file = files[Object.keys(fileMetadata).indexOf(fileId)];
    const fileData = await fs.readFile(file.path);

    const uploadUrl = `${device.protocol}://${device.ip}:${device.port}/api/localsend/v2/upload?sessionId=${sessionId}&fileId=${fileId}&token=${token}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: fileData,
      timeout: 60000,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file ${file.name}: ${uploadResponse.status}`);
    }
  });

  await Promise.all(uploadPromises);
};
