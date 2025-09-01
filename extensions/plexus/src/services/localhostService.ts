import { LocalhostItem } from "../types/LocalhostItem";
import { findNodeProcesses, getProcessCommand, getWorkingDirectory } from "../utils/processUtils";
import { detectFramework, getProjectName, getProjectPath, createDisplayName } from "../utils/projectUtils";
import { getFavicon, getPageTitle } from "../utils/webUtils";

export async function getLocalhostItems(): Promise<LocalhostItem[]> {
  const output = await findNodeProcesses();
  const lines = output.split("\n").filter(Boolean);
  const items: LocalhostItem[] = [];

  for (const line of lines) {
    const [pid, port] = line.split(":");
    if (!pid || !port) continue;

    try {
      // Get the command for this process
      const cmdResult = await getProcessCommand(pid);

      // Skip non-Node.js processes
      if (!cmdResult.includes("node")) {
        continue;
      }

      // Get project information
      const workingDir = await getWorkingDirectory(pid);
      const projectPath = workingDir || getProjectPath(cmdResult);
      const framework = detectFramework(cmdResult);

      // Try to get the page title from the website
      const url = `http://localhost:${port}`;
      const pageTitle = await getPageTitle(url);

      // Use page title if available, otherwise fall back to file system
      const projectName = pageTitle || getProjectName(projectPath);
      const displayName = createDisplayName(projectName, framework);

      // Try to get favicon
      const favicon = await getFavicon(url);

      items.push({
        id: pid,
        name: displayName,
        port,
        pid,
        url,
        favicon,
      });
    } catch (error) {
      console.error(`Error processing PID ${pid}:`, error);
      // Simple fallback
      items.push({
        id: pid,
        name: `Node.js (port ${port})`,
        port,
        pid,
        url: `http://localhost:${port}`,
      });
    }
  }

  return items;
}
