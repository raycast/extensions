import os from "os";

interface NetworkDevice {
  name: string;
  ip: string;
}

interface NetworkInfo {
  devices: NetworkDevice[];
  count: number;
}

/**
 * Get network information
 * @returns {Promise<NetworkInfo>} Network information including interfaces and their IPs
 */
export default async function Command(): Promise<NetworkInfo> {
  try {
    const networkInterfaces = os.networkInterfaces();
    const devices: NetworkDevice[] = [];

    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      if (interfaces) {
        for (const interfaceObj of interfaces) {
          if (interfaceObj.family === "IPv4" && !interfaceObj.internal) {
            devices.push({ name, ip: interfaceObj.address });
          }
        }
      }
    }

    return {
      devices: devices,
      count: devices.length,
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve network information: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
