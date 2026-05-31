import { LocalhostItem } from "../types/LocalhostItem";
import { findNodeProcesses } from "../utils/processUtils";
import { detectFramework, getProjectPath } from "../utils/projectUtils";

export async function getLocalhostItems(): Promise<LocalhostItem[]> {
  const processes = await findNodeProcesses();
  const items: LocalhostItem[] = [];

  for (const proc of processes) {
    // Skip non-Node.js processes
    if (!proc.command.includes("node")) continue;

    // Prefer the real working directory; fall back to parsing the command line.
    const projectPath = proc.workingDir || getProjectPath(proc.command);
    const framework = detectFramework(proc.command);

    items.push({
      id: `${proc.source}:${proc.pid}:${proc.port}`,
      projectPath,
      framework,
      port: proc.port,
      pid: proc.pid,
      url: `http://localhost:${proc.port}`,
      source: proc.source,
      distro: proc.distro,
    });
  }

  return items;
}
