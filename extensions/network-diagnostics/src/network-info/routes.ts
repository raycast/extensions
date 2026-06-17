import { execa } from "execa";
import { NetworkDevices } from "./network-devices";

export interface Route {
  destination: string;
  interfaceName: string;
  interfaceAddr: string;
  gateway: string;
}

// Loads the routing table using `netstat`. Only returns IPv4 routes.
export async function routingTable(): Promise<Route[]> {
  // `-r` shows the routing table
  // `-n` shows numeric addresses
  // `-l` adds more columns (including the interface address)
  // `-f inet` shows IPv4 routes only
  const { stdout, exitCode } = await execa("/usr/sbin/netstat", ["-rnlf", "inet"], { timeout: 1000 });
  if (exitCode !== 0) {
    return [];
  }

  const routes: Route[] = [];
  const lines = stdout.split("\n");

  // Skip over the preamble lines and the header (which starts with "Destination")
  const startIndex = lines.findIndex((line) => line.startsWith("Destination"));
  if (startIndex === -1) {
    return [];
  }

  for (const line of lines.slice(startIndex + 1)) {
    // Headers for the `netstat -rnl` output:
    // Destination Gateway RT_IFA Flags Refs Use Mtu Netif Expire
    const parts = line.split(/\s+/);
    if (parts.length < 8) {
      continue;
    }

    const route: Route = {
      destination: parts[0],
      gateway: parts[1],
      interfaceAddr: parts[2],
      interfaceName: parts[7],
    };
    routes.push(route);
  }

  return routes;
}

// Returns an array of the default routes.
export async function defaultRoutes(): Promise<Route[]> {
  const routes = await routingTable();
  return routes.filter((route) => route.destination === "default");
}

// Returns the routes for interfaces backed by physical network devices (as opposed to
// virtual devices like VPNs).
export function physicalRoutes(devices: NetworkDevices, routes: Route[]): Route[] {
  const hwInterfaces = Object.keys(devices);
  return routes
    .filter((route) => hwInterfaces.includes(route.interfaceName))
    .sort((a, b) => devices[a.interfaceName].serviceOrder - devices[b.interfaceName].serviceOrder);
}
