import { Service } from "bonjour-service";
import { useCallback, useEffect, useState } from "react";

type DeviceStatus = "connected" | "disconnected" | "standby" | "connecting" | "disconnecting" | "unknown";

type TunebladeDevice = {
  id: string;
  status: DeviceStatus;
  volume: number;
  name: string;
};

function serviceUrl(service: Service, path: string) {
  return `http://${service.referer?.address ?? service.addresses?.[0] ?? ""}:${service.port}/v2${path}`;
}

function parseStatusCode(statusValue: string): DeviceStatus {
  switch (statusValue) {
    case "0":
      return "disconnected";
    case "100":
      return "connected";
    case "200":
      return "standby";
    case "10":
      return "connecting";
    case "400":
      return "disconnecting";
    default:
      console.warn("Unknown status value:", statusValue);
      return "unknown";
  }
}

export function useTuneblade({ service }: { service: Service }) {
  const [info, setInfo] = useState<TunebladeDevice[]>();

  const refresh = useCallback(
    (id?: string) => {
      fetch(serviceUrl(service, id ? `/${id}` : "/"))
        .then((response) => response.text())
        .then((data) => {
          const lines = data.split("\n").filter((line) => line.trim() !== "");

          const devices: TunebladeDevice[] = lines.map((line) => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 4) {
              throw new Error(`Invalid device line format: ${line}`);
            }

            const [id, statusValue, volumeValue, ...nameParts] = parts;

            const status = parseStatusCode(statusValue);

            return {
              id,
              status,
              volume: parseInt(volumeValue, 10),
              name: nameParts.join(" "),
            };
          });

          setInfo((prev) => {
            if (
              !prev ||
              prev.length !== devices.length ||
              prev.some(
                (d, i) =>
                  d.id !== devices[i].id ||
                  d.status !== devices[i].status ||
                  d.volume !== devices[i].volume ||
                  d.name !== devices[i].name,
              )
            ) {
              return devices;
            }
            return prev;
          });
        })
        .catch((error) => console.error("Error fetching Tuneblade info:", error));
    },
    [service],
  );

  const setVolume = useCallback(
    (id: string, volume: number) => {
      fetch(serviceUrl(service, `/${id}/Volume/${volume}`))
        .then((response) => response.text())
        .then(() => {
          // Update the specific device volume immediately
          setInfo((prev) => {
            if (!prev) return prev;

            return prev.map((device) => (device.id === id ? { ...device, volume } : device));
          });
        })
        .catch((error) => {
          console.error("Error setting volume:", error);
          // Refresh on error to ensure we have the latest state
          refresh();
        });
    },
    [service, refresh],
  );

  const setConnection = useCallback(
    (id: string, status: DeviceStatus) => {
      const statusAction = status === "connected" ? "Connect" : status === "disconnected" ? "Disconnect" : null;

      if (!statusAction) {
        console.warn("Invalid connection status requested:", status);
        return;
      }

      fetch(serviceUrl(service, `/${id}/Status/${statusAction}`))
        .then((response) => response.text())
        .then((data) => {
          // Parse the response status code and update the specific device
          const newStatus = parseStatusCode(data.trim());

          // Update the specific device status immediately
          setInfo((prev) => {
            if (!prev) return prev;

            return prev.map((device) => (device.id === id ? { ...device, status: newStatus } : device));
          });
        })
        .catch((error) => {
          console.error("Error setting connection:", error);
          // Refresh on error to ensure we have the latest state
          refresh();
        });
    },
    [service, refresh],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    devices: info,
    refresh,
    setVolume,
    setConnection,
  };
}
