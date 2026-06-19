import dgram from "node:dgram";
import { LocalStorage } from "@raycast/api";
import { getDeviceInfo, getLocalIPs, MULTICAST_ADDRESS, MULTICAST_PORT } from "./localsend";
import { setCachedDevices } from "./device-cache";
import { LocalSendDevice } from "../types";

const ANNOUNCE_INTERVAL = 5000; // Announce every 5 seconds (reduced frequency to avoid UI interruption)
const RESTART_DELAY = 5000; // Restart faster on errors
const STATUS_KEY = "discovery-service-status";

const discoveredDevices = new Map<string, LocalSendDevice>();

let discoverySocket: dgram.Socket | null = null;
let announceTimer: NodeJS.Timeout | null = null;
let restartTimer: NodeJS.Timeout | null = null;
let shouldBeRunning = false;

const setRunningStatus = async (running: boolean) => {
  await LocalStorage.setItem(STATUS_KEY, running);
};

export const startDiscoveryService = (): void => {
  shouldBeRunning = true;

  if (discoverySocket) {
    console.log("Discovery service already running");
    setRunningStatus(true);
    return;
  }

  try {
    const deviceInfo = getDeviceInfo();
    discoverySocket = dgram.createSocket({ type: "udp4", reuseAddr: true });

    discoverySocket.on("error", (err) => {
      console.error("Discovery service error:", err);
      cleanup();

      if (shouldBeRunning) {
        console.log("Attempting to restart discovery service...");
        restartTimer = setTimeout(() => {
          startDiscoveryService();
        }, RESTART_DELAY);
      }
    });

    discoverySocket.on("close", () => {
      console.log("Discovery socket closed");
      cleanup();
    });

    discoverySocket.on("message", async (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString());

        if (data.fingerprint === deviceInfo.fingerprint) {
          return;
        }

        // Cache discovered device
        const device: LocalSendDevice = {
          ...data,
          ip: rinfo.address,
          lastSeen: Date.now(),
        };
        discoveredDevices.set(data.fingerprint, device);

        // Update cache in storage
        await setCachedDevices(Array.from(discoveredDevices.values()));

        if (data.announce) {
          const response = { ...deviceInfo, announce: false };
          const responseStr = JSON.stringify(response);
          discoverySocket?.send(responseStr, MULTICAST_PORT, rinfo.address, (err) => {
            if (err) {
              console.error("Error sending response:", err);
            }
          });
        }
      } catch (error) {
        console.error("Error handling discovery message:", error);
      }
    });

    discoverySocket.bind({ port: MULTICAST_PORT, exclusive: false }, () => {
      try {
        if (!discoverySocket) return;

        discoverySocket.addMembership(MULTICAST_ADDRESS);
        discoverySocket.setBroadcast(true);
        console.log("Discovery service started and listening");

        const sendAnnouncement = () => {
          if (!discoverySocket || !shouldBeRunning) {
            return;
          }

          try {
            const currentDeviceInfo = getDeviceInfo();
            const announcement = { ...currentDeviceInfo, announce: true };
            const message = Buffer.from(JSON.stringify(announcement));

            discoverySocket.send(message, MULTICAST_PORT, MULTICAST_ADDRESS, (err) => {
              if (err) {
                console.error("Error sending announcement:", err);
              } else {
                console.log("Announcement sent successfully");
              }
            });
          } catch (error) {
            console.error("Error in sendAnnouncement:", error);
          }
        };

        sendAnnouncement();
        setRunningStatus(true);

        if (announceTimer) {
          clearInterval(announceTimer);
        }
        announceTimer = setInterval(sendAnnouncement, ANNOUNCE_INTERVAL);

        // Keep the timer referenced so it continues to run
        // announceTimer.unref(); // REMOVED - this was preventing the loop from running!
      } catch (error) {
        console.error("Error setting up discovery service:", error);
        cleanup();
      }
    });
  } catch (error) {
    console.error("Failed to create discovery service:", error);
    cleanup();
  }
};

const cleanup = () => {
  if (announceTimer) {
    clearInterval(announceTimer);
    announceTimer = null;
  }

  if (discoverySocket) {
    try {
      discoverySocket.close();
    } catch (error) {
      console.error("Error closing socket:", error);
    }
    discoverySocket = null;
  }

  setRunningStatus(false);
};

export const stopDiscoveryService = (): void => {
  shouldBeRunning = false;

  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }

  cleanup();
  console.log("Discovery service stopped");
};

export const isDiscoveryRunning = async (): Promise<boolean> => {
  const status = await LocalStorage.getItem<boolean>(STATUS_KEY);
  return status === true;
};

export const getDiscoveryStatus = async (): Promise<{
  running: boolean;
  localIPs: string[];
  deviceInfo: ReturnType<typeof getDeviceInfo>;
}> => ({
  running: await isDiscoveryRunning(),
  localIPs: getLocalIPs(),
  deviceInfo: getDeviceInfo(),
});
