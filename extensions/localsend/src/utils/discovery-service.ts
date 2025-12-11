import dgram from "node:dgram";
import { getDeviceInfo, getLocalIPs } from "./localsend";

const MULTICAST_ADDRESS = "224.0.0.167";
const MULTICAST_PORT = 53317;
const ANNOUNCE_INTERVAL = 5000; // Announce every 5 seconds

let discoverySocket: dgram.Socket | null = null;
let announceTimer: NodeJS.Timeout | null = null;

export const startDiscoveryService = (): void => {
  if (discoverySocket) {
    return;
  }

  const deviceInfo = getDeviceInfo();
  discoverySocket = dgram.createSocket({ type: "udp4", reuseAddr: true });

  discoverySocket.on("error", (err) => {
    console.error("Discovery service error:", err);
    stopDiscoveryService();
  });

  discoverySocket.on("message", (msg, rinfo) => {
    try {
      const data = JSON.parse(msg.toString());

      if (data.fingerprint === deviceInfo.fingerprint) {
        return;
      }

      if (data.announce) {
        const response = { ...deviceInfo, announce: false };
        discoverySocket?.send(JSON.stringify(response), MULTICAST_PORT, rinfo.address);
      }
    } catch (error) {
      console.error("Error handling discovery message:", error);
    }
  });

  discoverySocket.bind({ port: MULTICAST_PORT, exclusive: false }, () => {
    try {
      discoverySocket?.addMembership(MULTICAST_ADDRESS);
      discoverySocket?.setBroadcast(true);
      console.log("Discovery service started");

      const sendAnnouncement = () => {
        const announcement = { ...deviceInfo, announce: true };
        const message = Buffer.from(JSON.stringify(announcement));
        discoverySocket?.send(message, MULTICAST_PORT, MULTICAST_ADDRESS);
      };

      sendAnnouncement();

      announceTimer = setInterval(sendAnnouncement, ANNOUNCE_INTERVAL);
    } catch (error) {
      console.error("Error starting discovery service:", error);
    }
  });
};

export const stopDiscoveryService = (): void => {
  if (announceTimer) {
    clearInterval(announceTimer);
    announceTimer = null;
  }

  if (discoverySocket) {
    discoverySocket.close();
    discoverySocket = null;
    console.log("Discovery service stopped");
  }
};

export const isDiscoveryRunning = (): boolean => discoverySocket !== null;

export const getDiscoveryStatus = (): {
  running: boolean;
  localIPs: string[];
  deviceInfo: ReturnType<typeof getDeviceInfo>;
} => ({
  running: isDiscoveryRunning(),
  localIPs: getLocalIPs(),
  deviceInfo: getDeviceInfo(),
});
