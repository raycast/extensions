import { status } from "minecraft-server-util";
import type { Server } from "../types";

function parseAddress(address: string): { host: string; port: number } {
  const lastColon = address.lastIndexOf(":");
  if (lastColon !== -1) {
    const port = parseInt(address.slice(lastColon + 1), 10);
    if (!isNaN(port)) return { host: address.slice(0, lastColon), port };
  }
  return { host: address, port: 25565 };
}

export async function pingServer(
  server: Server,
): Promise<Pick<Server, "online" | "playersOnline" | "playersMax" | "version">> {
  const { host, port } = parseAddress(server.address);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await status(host, port, { timeout: 5000 });
      return {
        online: true,
        playersOnline: result.players.online,
        playersMax: result.players.max,
        version: result.version.name,
      };
    } catch {
      // retry once immediately
    }
  }
  return { online: false };
}
