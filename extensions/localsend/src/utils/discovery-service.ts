import dgram from "node:dgram";
import { getDeviceInfo, getLocalIPs } from "./localsend";

const MULTICAST_ADDRESS = "224.0.0.167";
const MULTICAST_PORT = 53317;
const ANNOUNCE_INTERVAL = 3000; // Announce every 3 seconds (more frequent)
const RESTART_DELAY = 5000; // Restart faster on errors
const SOCKET_TIMEOUT = 60000; // Keep socket alive for 60 seconds

let discoverySocket: dgram.Socket | null = null;
let announceTimer: NodeJS.Timeout | null = null;
let restartTimer: NodeJS.Timeout | null = null;
let shouldBeRunning = false;

export const startDiscoveryService = (): void => {
  shouldBeRunning = true;

  if (discoverySocket) {
    console.log("Discovery service already running");
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

    discoverySocket.on("message", (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString());

        if (data.fingerprint === deviceInfo.fingerprint) {
          return;
        }

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

        if (announceTimer) {
          clearInterval(announceTimer);
        }
        announceTimer = setInterval(sendAnnouncement, ANNOUNCE_INTERVAL);

        announceTimer.unref();
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
