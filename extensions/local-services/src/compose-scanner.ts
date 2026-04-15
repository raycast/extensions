import { exec } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";
import { LocalService } from "./types";

const execAsync = promisify(exec);

// Lightweight YAML parser for docker-compose files
// Handles the common "services > name > ports" structure without a dependency
function parseComposeServices(content: string): { name: string; image?: string; ports: number[] }[] {
  const results: { name: string; image?: string; ports: number[] }[] = [];
  const lines = content.split("\n");

  let inServices = false;
  let currentService: string | null = null;
  let currentImage: string | undefined;
  let currentPorts: number[] = [];
  let inPorts = false;
  let servicesIndent = -1;
  let serviceIndent = -1;
  let serviceNameIndent = -1; // auto-detected from first entry under services:

  const getIndent = (line: string): number => {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const indent = getIndent(line);

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Detect "services:" top-level key
    if (trimmed === "services:" && indent === 0) {
      inServices = true;
      servicesIndent = 0;
      serviceNameIndent = -1;
      continue;
    }

    // Another top-level key ends the services block
    if (indent === 0 && inServices && !trimmed.startsWith("-")) {
      // Flush last service
      if (currentService && currentPorts.length > 0) {
        results.push({ name: currentService, image: currentImage, ports: [...currentPorts] });
      }
      inServices = false;
      currentService = null;
      continue;
    }

    if (!inServices) continue;

    // Auto-detect service name indent from the first child entry under services:
    if (serviceNameIndent === -1 && indent > servicesIndent && trimmed.endsWith(":") && !trimmed.startsWith("-")) {
      serviceNameIndent = indent;
    }

    // Detect a service name (direct child of services, ends with ":")
    if (serviceNameIndent !== -1 && indent === serviceNameIndent && trimmed.endsWith(":") && !trimmed.startsWith("-")) {
      // Flush previous service
      if (currentService) {
        results.push({ name: currentService, image: currentImage, ports: [...currentPorts] });
      }
      currentService = trimmed.slice(0, -1).trim();
      currentImage = undefined;
      currentPorts = [];
      serviceIndent = indent;
      inPorts = false;
      continue;
    }

    if (!currentService) continue;

    // Detect "image:" line
    if (indent > serviceIndent && trimmed.startsWith("image:")) {
      currentImage = trimmed.replace("image:", "").trim().replace(/['"]/g, "");
      inPorts = false;
      continue;
    }

    // Detect "ports:" line
    if (indent > serviceIndent && trimmed === "ports:") {
      inPorts = true;
      continue;
    }

    // Inside ports list, parse entries like "- 8080:80" or "- '3000:3000'"
    if (inPorts && trimmed.startsWith("-")) {
      const portValue = trimmed.slice(1).trim().replace(/['"]/g, "");

      // Patterns: "8080:80", "8080:80/tcp", "127.0.0.1:8080:80"
      const match = portValue.match(/(?:[\d.]+:)?(\d+):\d+/);
      if (match) {
        const hostPort = parseInt(match[1], 10);
        if (!isNaN(hostPort)) {
          currentPorts.push(hostPort);
        }
      } else {
        // Simple port like "3000"
        const simple = parseInt(portValue, 10);
        if (!isNaN(simple)) {
          currentPorts.push(simple);
        }
      }
      continue;
    }

    // A non-dash line at the right indent level means we left the ports list
    if (inPorts && !trimmed.startsWith("-")) {
      inPorts = false;
    }
  }

  // Flush last service
  if (currentService) {
    results.push({ name: currentService, image: currentImage, ports: [...currentPorts] });
  }

  return results;
}

// Find docker-compose files in common project directories
async function findComposeFiles(): Promise<string[]> {
  const home = process.env.HOME || "/Users";

  // Search in home directory up to 4 levels deep
  // Look for common compose filenames
  const names = ["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"];
  const nameArgs = names.map((n) => `-name "${n}"`).join(" -o ");

  try {
    const { stdout } = await execAsync(
      `find "${home}" -maxdepth 4 \\( ${nameArgs} \\) -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -50`,
      { timeout: 5000 },
    );
    return stdout.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

// Main: scan compose files and return declared services
export async function getComposeServices(runningPorts: Set<number>): Promise<LocalService[]> {
  const files = await findComposeFiles();
  const services: LocalService[] = [];
  const seen = new Set<string>();

  for (const filePath of files) {
    try {
      const content = await readFile(filePath, "utf-8");
      const parsed = parseComposeServices(content);

      for (const svc of parsed) {
        for (const port of svc.ports) {
          const key = `compose-${filePath}-${svc.name}-${port}`;
          if (seen.has(key)) continue;
          seen.add(key);

          // If this port is already running, skip it (it's already in Docker or lsof results)
          if (runningPorts.has(port)) continue;

          services.push({
            id: key,
            port,
            processName: svc.name,
            address: "0.0.0.0",
            source: "compose",
            status: "stopped",
            processType: "docker",
            containerImage: svc.image,
            composeFile: filePath,
            composeName: svc.name,
          });
        }
      }
    } catch {
      // File unreadable, skip
      continue;
    }
  }

  return services;
}
