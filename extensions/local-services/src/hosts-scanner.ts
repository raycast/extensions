import { readFile } from "fs/promises";
import { LocalService } from "./types";

// Parse /etc/hosts for custom local domains pointing to 127.0.0.1
export async function getHostsEntries(): Promise<LocalService[]> {
  try {
    const content = await readFile("/etc/hosts", "utf-8");
    const lines = content.split("\n");
    const services: LocalService[] = [];
    const seen = new Set<string>();

    // Domains to ignore (standard system entries)
    const systemDomains = new Set([
      "localhost",
      "broadcasthost",
      "ip6-localhost",
      "ip6-loopback",
      "ip6-localnet",
      "ip6-mcastprefix",
      "ip6-allnodes",
      "ip6-allrouters",
    ]);

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length < 2) continue;

      const ip = parts[0];
      // Only care about loopback addresses
      if (ip !== "127.0.0.1" && ip !== "::1") continue;

      // Each line can have multiple hostnames
      for (let i = 1; i < parts.length; i++) {
        const hostname = parts[i];
        // Stop at inline comments
        if (hostname.startsWith("#")) break;

        if (systemDomains.has(hostname.toLowerCase())) continue;
        if (seen.has(hostname)) continue;
        seen.add(hostname);

        services.push({
          id: `hosts-${hostname}`,
          port: 80, // Default assumption for hosts entries
          processName: hostname,
          address: ip,
          source: "hosts",
          status: "declared",
          processType: "other",
          hostname,
        });
      }
    }

    return services;
  } catch {
    return [];
  }
}
