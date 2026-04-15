import { exec } from "child_process";
import { promisify } from "util";
import { DockerContainer, LocalService } from "./types";

const execAsync = promisify(exec);

// Parse Docker port strings like "0.0.0.0:3000->3000/tcp" into port numbers
function parseDockerPorts(portsStr: string): number[] {
  if (!portsStr || portsStr.trim() === "") return [];

  const ports: number[] = [];
  const mappings = portsStr.split(",").map((s) => s.trim());

  for (const mapping of mappings) {
    // Match patterns like "0.0.0.0:8080->80/tcp" or ":::8080->80/tcp"
    const match = mapping.match(/(?:\d+\.\d+\.\d+\.\d+|::):(\d+)->/);
    if (match) {
      ports.push(parseInt(match[1], 10));
    }
  }

  return ports;
}

// Check if Docker is available on this machine
export async function isDockerAvailable(): Promise<boolean> {
  try {
    await execAsync("docker info");
    return true;
  } catch {
    return false;
  }
}

// Get running Docker containers and their port mappings
export async function getDockerContainers(): Promise<LocalService[]> {
  try {
    const { stdout } = await execAsync(
      'docker ps --format \'{"ID":"{{.ID}}","Names":"{{.Names}}","Image":"{{.Image}}","Status":"{{.Status}}","Ports":"{{.Ports}}","State":"{{.State}}"}\'',
    );

    const lines = stdout.trim().split("\n").filter(Boolean);
    const services: LocalService[] = [];

    for (const line of lines) {
      let container: DockerContainer;
      try {
        container = JSON.parse(line);
      } catch {
        continue;
      }

      const ports = parseDockerPorts(container.Ports);

      for (const port of ports) {
        services.push({
          id: `docker-${container.ID}-${port}`,
          port,
          processName: container.Names,
          address: "0.0.0.0",
          source: "docker",
          status: "running",
          processType: "docker",
          containerName: container.Names,
          containerImage: container.Image,
          containerId: container.ID,
        });
      }
    }

    return services;
  } catch {
    return [];
  }
}
