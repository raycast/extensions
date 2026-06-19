import { LocalhostItem } from "../types/LocalhostItem";
import { findListeningServers, enrichHostServers } from "../utils/processUtils";
import { detectFramework, getProjectPath } from "../utils/projectUtils";
import { respondsToHttp } from "../utils/probe";

export async function getLocalhostItems(): Promise<LocalhostItem[]> {
  const servers = await findListeningServers();

  // One row per port. Prefer the WSL entry on a collision since it carries command + cwd.
  const byPort = new Map<string, (typeof servers)[number]>();
  for (const server of servers) {
    const existing = byPort.get(server.port);
    if (!existing || (server.source === "wsl" && existing.source !== "wsl")) {
      byPort.set(server.port, server);
    }
  }
  const candidates = [...byPort.values()];

  // Keep only the ports that actually answer an HTTP request (i.e. open in a browser).
  const reachable = await Promise.all(candidates.map((server) => respondsToHttp(server.port)));
  const webServers = candidates.filter((_, index) => reachable[index]);

  // Fill in command line + working dir for native-host survivors (WSL ones already have them).
  await enrichHostServers(webServers);

  return webServers
    .map((server) => {
      const projectPath = server.workingDir || getProjectPath(server.command);
      return {
        id: `${server.source}:${server.pid}:${server.port}`,
        projectPath,
        framework: detectFramework(server.command),
        port: server.port,
        pid: server.pid,
        url: `http://localhost:${server.port}`,
        source: server.source,
        distro: server.distro,
      };
    })
    .sort((a, b) => parseInt(a.port) - parseInt(b.port));
}
