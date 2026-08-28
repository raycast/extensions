import { LocalhostItem } from "../types/LocalhostItem";
import { findListeningServers, enrichHostServers, ListeningServer } from "../utils/processUtils";
import { detectFramework, getProjectPath } from "../utils/projectUtils";
import { probeHttp } from "../utils/probe";

const byPort = (a: LocalhostItem, b: LocalhostItem) => parseInt(a.port) - parseInt(b.port);

// One row per port. Prefer the WSL entry on a collision since it carries command + cwd.
async function gatherCandidates(): Promise<ListeningServer[]> {
  const servers = await findListeningServers();
  const deduped = new Map<string, ListeningServer>();
  for (const server of servers) {
    const existing = deduped.get(server.port);
    if (!existing || (server.source === "wsl" && existing.source !== "wsl")) {
      deduped.set(server.port, server);
    }
  }
  return [...deduped.values()];
}

function toItem(server: ListeningServer, title?: string): LocalhostItem {
  const projectPath = server.workingDir || getProjectPath(server.command);
  return {
    id: `${server.source}:${server.pid}:${server.port}`,
    projectPath,
    framework: detectFramework(server.command),
    port: server.port,
    pid: server.pid,
    url: `http://localhost:${server.port}`,
    title,
    source: server.source,
    distro: server.distro,
  };
}

// Probe every listening port in parallel and emit each confirmed web server via `onItem` the
// moment its probe passes — so a fast server shows in milliseconds while a slow dev server (which
// can take ~1s to render its first response) streams in later instead of blocking the whole list.
// Resolves with the full, port-sorted list once every candidate has settled.
export async function streamLocalhostItems(onItem: (item: LocalhostItem) => void): Promise<LocalhostItem[]> {
  const candidates = await gatherCandidates();
  const items: LocalhostItem[] = [];

  await Promise.all(
    candidates.map(async (server) => {
      try {
        // Keep only ports that answer an HTTP request (i.e. open in a browser). The probe also
        // returns the page <title> from the same response, so we never fetch the page twice.
        const probe = await probeHttp(server.port);
        if (!probe.ok) return;
        // Fill in command line + working dir for native-host survivors (WSL ones already have them).
        await enrichHostServers([server]);
        const item = toItem(server, probe.title);
        items.push(item);
        onItem(item);
      } catch {
        // A single misbehaving port must not fail the whole scan — skip it and keep going.
      }
    }),
  );

  return items.sort(byPort);
}

// Non-streaming wrapper for callers that just want the full list once.
export async function getLocalhostItems(): Promise<LocalhostItem[]> {
  return streamLocalhostItems(() => {});
}
