import { LocalhostItem } from "../types/LocalhostItem";
import { findNodeProcesses, getProcessCommand, getWorkingDirectory } from "../utils/processUtils";
import { detectFramework, getProjectPath } from "../utils/projectUtils";

async function getProcessDetails(pid: string, cmdResult: string) {
  try {
    // Get project information
    const workingDir = await getWorkingDirectory(pid);
    const projectPath = workingDir || getProjectPath(cmdResult);
    const framework = detectFramework(cmdResult);

    return {
      workingDir,
      projectPath,
      framework,
    };
  } catch {
    return undefined;
  }
}

export async function getLocalhostItems(): Promise<LocalhostItem[]> {
  const output = await findNodeProcesses();
  const lines = output.split("\n").filter(Boolean);
  const items: LocalhostItem[] = [];

  for (const line of lines) {
    const [pid, port] = line.split(":");
    if (!pid || !port) continue;

    // Get the command for this process
    const cmdResult = await getProcessCommand(pid);

    // Skip non-Node.js processes
    if (!cmdResult.includes("node")) continue;

    const details = await getProcessDetails(pid, cmdResult);

    if (!details) continue;

    const { projectPath, framework } = details;
    const url = `http://localhost:${port}`;

    items.push({
      id: pid,
      projectPath,
      framework,
      port,
      pid,
      url,
    });
  }

  return items;
}
