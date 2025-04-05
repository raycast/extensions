import { showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { getLightproxyPath } from "./preferences";

const execFileAsync = promisify(execFile);

/**
 * Run a LightProxy command and return the output
 */
export async function runLightproxyCommand(args: string[]): Promise<string> {
  try {
    const lightproxyPath = getLightproxyPath();
    const { stdout } = await execFileAsync(lightproxyPath, args);
    return stdout;
  } catch (error) {
    const err = error as Error & { stderr?: string };
    console.error("Error running LightProxy command:", error);

    // Show error toast
    await showToast({
      style: Toast.Style.Failure,
      title: "LightProxy Error",
      message: err.message || "Unknown error",
    });

    throw new Error(err.stderr || err.message);
  }
}

/**
 * Parse the output of the status command
 */
export interface LightproxyStatus {
  status: string;
  httpAddress: string;
  httpsAddress: string;
  tld: string;
  mappings: number;
  time: string;
}

export async function getStatus(): Promise<LightproxyStatus> {
  const output = await runLightproxyCommand(["status"]);

  try {
    // Simple parsing of the output, assuming JSON format
    const lines = output.split("\n").filter((line) => line.trim());
    const result: Partial<LightproxyStatus> = {};

    for (const line of lines) {
      if (line.includes("Status:")) {
        result.status = line.split(":")[1].trim();
      } else if (line.includes("HTTP Address:")) {
        result.httpAddress = line.split(":")[1].trim() + ":" + line.split(":")[2].trim();
      } else if (line.includes("HTTPS Address:")) {
        result.httpsAddress = line.split(":")[1].trim() + ":" + line.split(":")[2].trim();
      } else if (line.includes("TLD:")) {
        result.tld = line.split(":")[1].trim();
      } else if (line.includes("Mappings:")) {
        result.mappings = parseInt(line.split(":")[1].trim(), 10);
      } else if (line.includes("Time:")) {
        result.time = line.split("Time: ")[1].trim();
      }
    }

    return result as LightproxyStatus;
  } catch (error) {
    console.error("Error parsing status output:", error);
    throw new Error("Failed to parse LightProxy status");
  }
}

/**
 * Interface for mapping data
 */
export interface Mapping {
  type: string;
  hostname: string;
  destination: string;
  httpUrl?: string;
  httpsUrl?: string;
}

/**
 * Parse the output of the list command to get mappings
 */
export async function getMappings(): Promise<Mapping[]> {
  const output = await runLightproxyCommand(["list", "--urls"]);

  try {
    const lines = output.split("\n").filter((line) => line.trim());
    const mappings: Mapping[] = [];

    let i = 0;
    // Skip header line
    while (i < lines.length) {
      if (lines[i].includes("Type") && lines[i].includes("Hostname")) {
        i++;
        break;
      }
      i++;
    }

    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        i++;
        continue;
      }

      // Parse the line - assuming a format like:
      // Type        Hostname              Destination
      // Node        api.test             127.0.0.1:3000
      // HTTP URL: http://api.test
      // HTTPS URL: https://api.test

      const parts = line.split(/\s+/).filter((p) => p.trim());
      if (parts.length >= 3) {
        const mapping: Mapping = {
          type: parts[0],
          hostname: parts[1],
          destination: parts[2],
        };

        // Check if next lines have URLs
        if (i + 1 < lines.length && lines[i + 1].includes("HTTP URL:")) {
          mapping.httpUrl = lines[i + 1].split("HTTP URL:")[1].trim();
          i++;
        }

        if (i + 1 < lines.length && lines[i + 1].includes("HTTPS URL:")) {
          mapping.httpsUrl = lines[i + 1].split("HTTPS URL:")[1].trim();
          i++;
        }

        mappings.push(mapping);
      }

      i++;
    }

    return mappings;
  } catch (error) {
    console.error("Error parsing list output:", error);
    throw new Error("Failed to parse LightProxy mappings");
  }
}

/**
 * Interface for discovered service data
 */
export interface DiscoveredService {
  name: string;
  type: string;
  address: string;
  added: boolean;
}

/**
 * Discover services using the LightProxy discover command
 */
export async function discoverServices(): Promise<DiscoveredService[]> {
  try {
    const output = await runLightproxyCommand(["discover"]);

    try {
      // Fallback to text parsing if JSON fails
      const lines = output.split("\n").filter((line) => line.trim());
      const parsedServices: DiscoveredService[] = [];

      for (const line of lines) {
        if (line.includes("Discovered") || line.includes("Found") || line.includes("Total")) {
          continue;
        }

        const parts = line.split(/\s+/).filter((p) => p.trim());
        if (parts.length >= 3) {
          parsedServices.push({
            name: parts[0],
            type: parts[1],
            address: parts[2],
            added: line.toLowerCase().includes("already added"),
          });
        }
      }

      return parsedServices;
    } catch (parseError) {
      console.error("Error parsing discover command output:", parseError);
      throw new Error("Failed to parse discover output: " + parseError);
    }
  } catch (error) {
    console.error("Error discovering services:", error);
    throw new Error("Failed to discover services");
  }
}

/**
 * Get all unique service types from discovered services
 */
export async function getServiceTypes(): Promise<string[]> {
  try {
    const services = await discoverServices();
    const types = new Set<string>();

    // Add empty option for auto-detect
    types.add("");

    // Add all discovered types
    services.forEach((service) => {
      if (service.type) {
        types.add(service.type.toLowerCase());
      }
    });

    return Array.from(types);
  } catch (error) {
    console.error("Error getting service types:", error);
    // Fallback to default types
    return ["", "node", "flask", "redis", "postgres", "mysql", "mongo", "docker", "web", "api", "other"];
  }
}
