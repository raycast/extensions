import {
  status,
  statusBedrock,
  JavaStatusResponse,
  BedrockStatusResponse,
} from "minecraft-server-util";
import { Icon } from "@raycast/api";
import { Server } from "./types";

export interface ServerStatus {
  online: boolean;
  version?: string;
  players?: {
    online: number;
    max: number;
    sample?: { name: string; id: string }[];
  };
  motd?: string;
  latency?: number;
  icon?: string | Icon; // Base64 string for Java servers or Raycast Icon
}

export function parseMotd(raw: string): string {
  if (!raw) return "";
  // Strip all § codes
  return raw.replace(/§[0-9a-fklmnor]/g, "");
}

export async function fetchServerStatus(server: Server): Promise<ServerStatus> {
  try {
    if (server.type === "java") {
      const response: JavaStatusResponse = await status(
        server.ip,
        server.port,
        { timeout: 5000 },
      );
      // Use raw MOTD or html if available, but raw usually has §.
      // minecraft-server-util provides 'html' but it might be full HTML page structure or spans.
      // Let's use our own parser on 'raw' or 'clean' text if we want control.
      // Actually 'motd.raw' or 'motd.html' might be better.
      // The library's .html property usually gives <span> tags with classes or styles.
      // Let's rely on our parser for consistency with Bedrock if needed, or check what .html gives.
      // .html from the library usually uses generic spans. Raycast needs inline styles.

      const motdRaw =
        typeof response.motd.raw === "string"
          ? response.motd.raw
          : response.motd.clean;

      return {
        online: true,
        version: response.version.name,
        players: {
          online: response.players.online,
          max: response.players.max,
          sample: response.players.sample || [],
        },
        motd: parseMotd(motdRaw),
        latency: response.roundTripLatency,
        icon: response.favicon ?? undefined,
      };
    } else {
      const startTime = Date.now();
      const response: BedrockStatusResponse = await statusBedrock(
        server.ip,
        server.port,
        { timeout: 5000 },
      );
      const latency = Date.now() - startTime;

      const motdRaw =
        typeof response.motd.raw === "string"
          ? response.motd.raw
          : response.motd.clean;

      return {
        online: true,
        version: response.version.name || "Unknown",
        players: {
          online: response.players.online,
          max: response.players.max,
        },
        motd: parseMotd(motdRaw),
        latency: latency,
      };
    }
  } catch {
    return {
      online: false,
      motd: "",
    };
  }
}
