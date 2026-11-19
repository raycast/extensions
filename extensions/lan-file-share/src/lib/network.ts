import os from "node:os";

export type NetworkInterface = {
  name: string;
  address: string;
};

/**
 * Non-loopback interfaces that actually carry an IPv4 address. Interfaces without IPv4 and the loopback
 * interface are not candidate addresses: nobody on the local network can reach those.
 */
export function listInterfaces(): NetworkInterface[] {
  const interfaces: NetworkInterface[] = [];
  for (const [name, addresses] of Object.entries(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family !== "IPv4" || address.internal) continue;
      interfaces.push({ name, address: address.address });
    }
  }
  return interfaces.sort(
    (left, right) =>
      left.name.localeCompare(right.name) ||
      left.address.localeCompare(right.address),
  );
}

export function pickSelectedInterface(
  host: string | undefined,
  interfaces: NetworkInterface[],
): string {
  if (host && interfaces.some((item) => item.address === host)) return host;
  return interfaces[0]?.address ?? "";
}
