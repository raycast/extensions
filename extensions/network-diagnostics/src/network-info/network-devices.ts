import { execa } from "execa";

// Map of interface names to corresponding network device details
export type NetworkDevices = { [key: string]: NetworkDevice };
export interface NetworkDevice {
  type: NetworkDeviceType;
  name: string;
  interfaceName: string;
  serviceOrder: number;
  ipAddress?: string;
}
export type NetworkDeviceType = "Wi-Fi" | "Ethernet" | "Firewire" | "Bluetooth" | "Thunderbolt" | "USB" | "Other";

// Internal type used to represent the output of `system_profiler SPNetworkDataType -json`
interface SPNetworkOutput {
  SPNetworkDataType: SPNetworkDataType[];
}

// Internal type used to represent the output of `system_profiler SPNetworkDataType -json`
interface SPNetworkDataType {
  _name: string;
  type: string;
  hardware?: string;
  interface?: string;
  DNS?: {
    ServerAddresses: string[];
  };
  IPv4: {
    Addresses?: string[];
    Router?: string;
  };
  spnetwork_service_order: number;
}

// Lists the computer's network devices using the `system_profiler` utility.
export async function hardwareNetworkDevices(): Promise<NetworkDevices> {
  const { stdout, exitCode } = await execa("/usr/sbin/system_profiler", ["SPNetworkDataType", "-json"], {
    timeout: 1000,
  });
  if (exitCode !== 0) {
    throw new Error("Failed to enumerate network devices");
  }

  const devices: NetworkDevices = {};
  const data = JSON.parse(stdout) as SPNetworkOutput;
  for (const device of data.SPNetworkDataType) {
    const { _name: name, type: spType, hardware: spHardware, interface: spInterface } = device;
    if (!name || !spType || !spInterface || !spHardware) {
      continue;
    }

    const type = deviceTypeRegexes.find(({ regex }) => regex.test(spHardware))?.type ?? "Other";
    devices[spInterface] = {
      name,
      type,
      interfaceName: spInterface,
      serviceOrder: device.spnetwork_service_order,
      ipAddress: device.IPv4?.Addresses?.[0],
    };
  }
  return devices;
}

const deviceTypeRegexes: { regex: RegExp; type: NetworkDeviceType }[] = [
  { regex: /Ethernet/i, type: "Ethernet" },
  { regex: /Wi-?Fi|AirPort/i, type: "Wi-Fi" },
  { regex: /FireWire/i, type: "Firewire" },
  { regex: /Thunderbolt/i, type: "Thunderbolt" },
  { regex: /Bluetooth/i, type: "Bluetooth" },
  { regex: /USB .* LAN/i, type: "USB" },
];
