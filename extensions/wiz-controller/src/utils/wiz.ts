import dgram from "dgram";
import { getPreferenceValues } from "@raycast/api";

export interface WizScene {
  id: number;
  name: string;
  category: "Static" | "Dynamic" | "Miscellaneous";
  isDynamic: boolean;
}

export const AC_SCENES: WizScene[] = [
  // Static
  { id: 6, name: "Cozy", category: "Static", isDynamic: false },
  { id: 11, name: "Warm White", category: "Static", isDynamic: false },
  { id: 12, name: "Daylight", category: "Static", isDynamic: false },
  { id: 13, name: "Cool white", category: "Static", isDynamic: false },
  { id: 14, name: "Night light", category: "Static", isDynamic: false },
  { id: 15, name: "Focus", category: "Static", isDynamic: false },
  { id: 16, name: "Relax", category: "Static", isDynamic: false },
  { id: 17, name: "True colors", category: "Static", isDynamic: false },
  { id: 18, name: "TV time", category: "Static", isDynamic: false },
  { id: 19, name: "Plantgrowth", category: "Static", isDynamic: false },

  // Dynamic
  { id: 1, name: "Ocean", category: "Dynamic", isDynamic: true },
  { id: 2, name: "Romance", category: "Dynamic", isDynamic: true },
  { id: 3, name: "Sunset", category: "Dynamic", isDynamic: true },
  { id: 4, name: "Party", category: "Dynamic", isDynamic: true },
  { id: 5, name: "Fireplace", category: "Dynamic", isDynamic: true },
  { id: 7, name: "Forest", category: "Dynamic", isDynamic: true },
  { id: 8, name: "Pastel Colors", category: "Dynamic", isDynamic: true },
  { id: 20, name: "Spring", category: "Dynamic", isDynamic: true },
  { id: 21, name: "Summer", category: "Dynamic", isDynamic: true },
  { id: 22, name: "Fall", category: "Dynamic", isDynamic: true },
  { id: 23, name: "Deepdive", category: "Dynamic", isDynamic: true },
  { id: 24, name: "Jungle", category: "Dynamic", isDynamic: true },
  { id: 25, name: "Mojito", category: "Dynamic", isDynamic: true },
  { id: 26, name: "Club", category: "Dynamic", isDynamic: true },
  { id: 27, name: "Christmas", category: "Dynamic", isDynamic: true },
  { id: 28, name: "Halloween", category: "Dynamic", isDynamic: true },
  { id: 29, name: "Candlelight", category: "Dynamic", isDynamic: true },
  { id: 30, name: "Golden white", category: "Dynamic", isDynamic: true },
  { id: 31, name: "Pulse", category: "Dynamic", isDynamic: true },
  { id: 32, name: "Steampunk", category: "Dynamic", isDynamic: true },

  // Miscellaneous
  { id: 9, name: "Wake up", category: "Miscellaneous", isDynamic: false },
  { id: 10, name: "Bedtime", category: "Miscellaneous", isDynamic: false },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendWizCommand(
  method: string,
  params: Record<string, unknown> = {},
): Promise<unknown> {
  const preferences = getPreferenceValues<Preferences>();
  const ip = preferences.ipAddress;
  const port = 38899;

  const payload = JSON.stringify({
    id: 1,
    method,
    params,
  });

  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");

    // Set a timeout
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error("Request timed out"));
    }, 2000);

    socket.on("error", (err) => {
      socket.close();
      clearTimeout(timeout);
      reject(err);
    });

    socket.on("message", (msg) => {
      socket.close();
      clearTimeout(timeout);
      try {
        const response = JSON.parse(msg.toString());
        resolve(response);
      } catch (e) {
        resolve({ raw: msg.toString() });
      }
    });

    socket.send(payload, port, ip, (err) => {
      if (err) {
        socket.close();
        clearTimeout(timeout);
        reject(err);
      }
      // Keep socket open for response if we expect one,
      // but for simple commands we might not Strictly need to wait for response essentially,
      // though typically Wiz lights send a simplified response '{"method":"...","env":"...","result":{...}}'
    });
  });
}
