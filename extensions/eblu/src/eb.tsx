import { ActionPanel, Action, List, getPreferenceValues, showToast, Toast, confirmAlert, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { execSync } from "child_process";

interface BluetoothDevice {
  name: string;
  address: string;
  connected: boolean;
  lastConnected?: Date;
  type?: string;
  batteryLevel?: string;
  rssi?: string;
  vendorId?: string;
  productId?: string;
  firmwareVersion?: string;
  protocol?: "classic" | "le" | "dual"; // Add this property
}

interface Preferences {
  maxDevices: number;
}

interface RawBluetoothDeviceData {
  [deviceName: string]: {
    device_address: string;
    device_minorType?: string;
    device_batteryLevelMain?: string;
    device_rssi?: string;
    device_vendorID?: string;
    device_productID?: string;
    device_firmwareVersion?: string;
  };
}

interface DiscoveredBluetoothDevice {
  name: string;
  address: string;
  rssi?: number;
}

function fuzzySearch(device: BluetoothDevice, searchText: string): boolean {
  const searchLower = searchText.toLowerCase();
  const nameLower = device.name.toLowerCase();
  const typeLower = (device.type || "").toLowerCase();

  const searchTerms = searchLower.split(" ");

  return searchTerms.every((term) => {
    const matchesName = fuzzyMatch(nameLower, term);
    const matchesType = fuzzyMatch(typeLower, term);
    return matchesName || matchesType;
  });
}

function fuzzyMatch(text: string, pattern: string): boolean {
  let j = 0;
  for (let i = 0; i < text.length && j < pattern.length; i++) {
    if (text[i] === pattern[j]) {
      j++;
    }
  }
  return j === pattern.length;
}

const getConnectionCommand = (device: BluetoothDevice): string => {
  // Try classic connection first for dual-mode devices
  if (device.protocol === "classic" || device.protocol === "dual") {
    return "--connect";
  }
  // Fall back to LE connection
  return "--connect-le";
};

const determineProtocol = (deviceData: RawBluetoothDeviceData[string]): "classic" | "le" | "dual" => {
  // Check device characteristics to determine protocol
  const isClassic =
    deviceData.device_minorType?.includes("Audio") ||
    deviceData.device_minorType?.includes("Keyboard") ||
    deviceData.device_minorType?.includes("Mouse");

  const isLE = deviceData.device_minorType?.includes("LE") || deviceData.device_batteryLevelMain !== undefined;

  return isClassic && isLE ? "dual" : isClassic ? "classic" : "le";
};

export default function Command() {
  const { maxDevices } = getPreferenceValues<Preferences>();
  const [allDevices, setAllDevices] = useState<BluetoothDevice[]>([]);
  const [searchText, setSearchText] = useState("");
  const [blueutilPath, setBlueutilPath] = useState<string>("");

  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<BluetoothDevice[]>([]);
  const [scanInterval, setScanInterval] = useState<NodeJS.Timeout | null>(null);
  const SCAN_INTERVAL = 2000; // 2 seconds between scans

  const [actionInProgress, setActionInProgress] = useState<string>("");

  const [scanningAnimation, setScanningAnimation] = useState(0);
  const SCANNING_ICONS = [Icon.Dot, Icon.CircleFilled];

  useEffect(() => {
    try {
      const path = execSync("command -v blueutil", { env: { PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" } })
        .toString()
        .trim();

      if (!path) {
        throw new Error("blueutil not found");
      }

      setBlueutilPath(path);
      refreshDevices();
    } catch (error) {
      console.error("Error: blueutil not found. Install with: brew install blueutil");
      return;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (scanInterval) {
        clearInterval(scanInterval);
      }
    };
  }, [scanInterval]);

  useEffect(() => {
    let animationInterval: NodeJS.Timeout;
    if (isScanning) {
      animationInterval = setInterval(() => {
        setScanningAnimation((prev) => (prev + 1) % SCANNING_ICONS.length);
      }, 500);
    }
    return () => {
      if (animationInterval) clearInterval(animationInterval);
    };
  }, [isScanning]);

  const refreshDevices = () => {
    try {
      const output = execSync("/usr/sbin/system_profiler SPBluetoothDataType -json").toString();
      const data = JSON.parse(output);

      const connectedDevices = data?.SPBluetoothDataType[0]?.device_connected || [];
      const disconnectedDevices = data?.SPBluetoothDataType[0]?.device_not_connected || [];

      const allDevices: BluetoothDevice[] = [
        ...connectedDevices.map((device: RawBluetoothDeviceData) => {
          const [name] = Object.keys(device);
          const deviceData = device[name];
          return {
            name,
            address: deviceData.device_address,
            connected: true,
            type: deviceData.device_minorType,
            batteryLevel: deviceData.device_batteryLevelMain,
            rssi: deviceData.device_rssi,
            vendorId: deviceData.device_vendorID,
            productId: deviceData.device_productID,
            firmwareVersion: deviceData.device_firmwareVersion,
            lastConnected: new Date(),
            protocol: determineProtocol(deviceData),
          };
        }),
        ...disconnectedDevices.map((device: RawBluetoothDeviceData) => {
          const [name] = Object.keys(device);
          const deviceData = device[name];
          return {
            name,
            address: deviceData.device_address,
            connected: false,
            type: deviceData.device_minorType,
            batteryLevel: deviceData.device_batteryLevelMain,
            lastConnected: undefined,
            rssi: deviceData.device_rssi,
            vendorId: deviceData.device_vendorID,
            productId: deviceData.device_productID,
            firmwareVersion: deviceData.device_firmwareVersion,
            protocol: determineProtocol(deviceData),
          };
        }),
      ];

      const sortedDevices = allDevices.sort((a, b) => {
        if (a.connected !== b.connected) {
          return a.connected ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      setAllDevices(sortedDevices);
    } catch (error) {
      console.error("Error fetching bluetooth devices:", error);
    }
  };

  const filteredDevices = searchText
    ? allDevices.filter((device) => fuzzySearch(device, searchText))
    : allDevices.slice(0, maxDevices);

  const toggleConnection = async (address: string, isConnected: boolean, name: string, device: BluetoothDevice) => {
    try {
      if (!blueutilPath) {
        throw new Error("blueutil path not set");
      }

      setActionInProgress(address);
      const action = isConnected ? "Disconnecting from" : "Connecting to";
      showToast(Toast.Style.Animated, `${action} ${name}...`);

      if (isConnected) {
        await execSync(`${blueutilPath} --disconnect ${address}`);
      } else {
        // Try classic connection first
        const cmd = getConnectionCommand(device);
        try {
          await execSync(`${blueutilPath} ${cmd} ${address}`);
        } catch (error) {
          // If classic fails, try LE connection
          console.log("First connection attempt failed, trying alternative method...");
          const altCmd = cmd === "--connect" ? "--connect-le" : "--connect";
          await execSync(`${blueutilPath} ${altCmd} ${address}`);
        }
      }

      await refreshDevices();
      showToast(Toast.Style.Success, `${isConnected ? "Disconnected from" : "Connected to"} ${name}`);
    } catch (error) {
      showToast(Toast.Style.Failure, `Failed to ${isConnected ? "disconnect from" : "connect to"} ${name}`);
      console.error("Error toggling connection:", error);
    } finally {
      setActionInProgress("");
    }
  };

  const forgetDevice = async (address: string, name: string) => {
    if (
      await confirmAlert({
        title: "Forget Device",
        message: `Are you sure you want to forget "${name}"?`,
        primaryAction: { title: "Forget", style: Action.Style.Destructive },
      })
    ) {
      try {
        setActionInProgress(address);
        showToast(Toast.Style.Animated, `Forgetting ${name}...`);

        // Disconnect first
        await execSync(`${blueutilPath} --disconnect ${address}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Then unpair
        await execSync(`${blueutilPath} --unpair ${address}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Finally power cycle Bluetooth
        await execSync(`${blueutilPath} --power 0`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await execSync(`${blueutilPath} --power 1`);

        showToast(Toast.Style.Success, `Forgot ${name}`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        refreshDevices();
      } catch (error) {
        console.error("Error forgetting device:", error);
        showToast(Toast.Style.Failure, "Failed to forget device");
      } finally {
        setActionInProgress("");
      }
    }
  };

  const startDiscovery = async () => {
    try {
      if (!blueutilPath) throw new Error("blueutil not found");

      if (scanInterval) {
        clearInterval(scanInterval);
        setScanInterval(null);
        setIsScanning(false);
        setScanningAnimation(0);
        showToast(Toast.Style.Success, "Scanning stopped");
        return;
      }

      setIsScanning(true);
      showToast(Toast.Style.Animated, "Started scanning...");
      const scanForDevices = async () => {
        try {
          const existingAddresses = allDevices.map((d) => d.address);
          const output = execSync(`${blueutilPath} --inquiry 1 --format json`).toString();
          const discovered = JSON.parse(output)
            .filter((device: DiscoveredBluetoothDevice) => !existingAddresses.includes(device.address))
            .map((device: DiscoveredBluetoothDevice) => ({
              name: device.name || "Unknown Device",
              address: device.address,
              connected: false,
              type: "New Device",
              rssi: device.rssi?.toString(),
            }));

          setDiscoveredDevices((prev) => {
            const newDevices = [...prev];
            interface DiscoveredDevice {
              name: string;
              address: string;
              connected: boolean;
              type?: string;
              rssi?: string;
            }

            discovered.forEach((device: DiscoveredDevice) => {
              const existingIndex = newDevices.findIndex((d: DiscoveredDevice) => d.address === device.address);
              if (existingIndex >= 0) {
                // Update existing device
                newDevices[existingIndex] = {
                  ...newDevices[existingIndex],
                  ...device,
                  rssi: device.rssi,
                };
              } else {
                // Add new device
                newDevices.push(device);
              }
            });
            return newDevices;
          });

          // Also refresh paired devices
          refreshDevices();
        } catch (error) {
          console.error("Scan error:", error);
        }
      };

      // Initial scan
      await scanForDevices();

      // Set up continuous scanning
      const interval = setInterval(scanForDevices, SCAN_INTERVAL);
      setScanInterval(interval);
    } catch (error) {
      setIsScanning(false);
      setScanningAnimation(0);
      showToast(Toast.Style.Failure, "Failed to start scanning");
      console.error("Discovery error:", error);
    }
  };

  const pairDevice = async (address: string, name: string) => {
    try {
      setActionInProgress(address);
      showToast(Toast.Style.Animated, `Pairing with ${name}...`);

      // First pair the device
      await execSync(`${blueutilPath} --pair ${address}`);
      // Wait for pairing to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Then try to connect
      await execSync(`${blueutilPath} --connect ${address}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Refresh the device list
      await refreshDevices();
      // Remove from discovered devices list
      setDiscoveredDevices((prev) => prev.filter((d) => d.address !== address));

      showToast(Toast.Style.Success, `Successfully paired and connected to ${name}`);
    } catch (error) {
      console.error("Pairing error:", error);
      showToast(Toast.Style.Failure, `Failed to pair with ${name}`);

      // Try to clean up if pairing failed
      try {
        await execSync(`${blueutilPath} --unpair ${address}`);
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }
    } finally {
      setActionInProgress("");
    }
  };

  return (
    <List
      isLoading={false} // We'll handle loading states manually
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarPlaceholder="Search devices or press ⌃D to scan for new devices"
    >
      {discoveredDevices.length > 0 && (
        <List.Section
          title={
            isScanning ? `Discovered Devices (Scanning${".".repeat(scanningAnimation + 1)})` : "Discovered Devices"
          }
        >
          {discoveredDevices.map((device) => (
            <List.Item
              key={device.address}
              title={device.name}
              subtitle="Available to pair"
              icon={
                actionInProgress === device.address
                  ? Icon.Clock
                  : isScanning
                    ? SCANNING_ICONS[scanningAnimation]
                    : Icon.Bluetooth
              }
              accessories={[
                {
                  icon: actionInProgress === device.address ? Icon.Clock : undefined,
                  text: [
                    actionInProgress === device.address ? "Pairing..." : "Available",
                    device.rssi ? `Signal: ${device.rssi}dBm` : null,
                  ]
                    .filter(Boolean)
                    .join(" • "),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Pair Device"
                    onAction={() => (actionInProgress ? null : pairDevice(device.address, device.name))}
                    icon={Icon.Link}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Paired Devices">
        {filteredDevices.map((device) => (
          <List.Item
            key={device.address}
            title={device.name}
            subtitle={device.type || "Unknown Device"}
            icon={getDeviceIcon(device, actionInProgress, isScanning, scanningAnimation)}
            accessories={[
              {
                icon: getAccessoryIcon(device, actionInProgress),
                text: [
                  getDeviceStatus(device, actionInProgress),
                  device.batteryLevel ? `Battery: ${device.batteryLevel}` : null,
                  device.rssi ? `Signal: ${device.rssi}dBm` : null,
                  device.firmwareVersion ? `FW: ${device.firmwareVersion}` : null,
                ]
                  .filter(Boolean)
                  .join(" • "),
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="General">
                  <Action
                    title="Refresh Devices"
                    onAction={actionInProgress ? () => {} : refreshDevices}
                    shortcut={{ modifiers: ["ctrl"], key: "r" }}
                    icon={Icon.RotateClockwise}
                  />
                  <Action
                    title={isScanning ? "Stop Scanning" : "Start Scanning"}
                    onAction={actionInProgress ? () => {} : startDiscovery}
                    shortcut={{ modifiers: ["ctrl"], key: "d" }}
                    icon={isScanning ? Icon.Stop : Icon.MagnifyingGlass}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Device Controls">
                  <Action
                    title={device.connected ? "Disconnect" : "Connect"}
                    onAction={() => toggleConnection(device.address, device.connected, device.name, device)}
                    shortcut={{ modifiers: ["ctrl"], key: "return" }}
                    icon={
                      actionInProgress === device.address
                        ? Icon.Clock
                        : device.connected
                          ? Icon.MinusCircle
                          : Icon.PlusCircle
                    }
                  />
                  <Action
                    title="Forget Device"
                    onAction={() =>
                      actionInProgress === device.address ? null : forgetDevice(device.address, device.name)
                    }
                    shortcut={{ modifiers: ["ctrl"], key: "backspace" }}
                    style={Action.Style.Destructive}
                    icon={actionInProgress === device.address ? Icon.Clock : Icon.Trash}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

const SCANNING_ICONS = [Icon.Dot, Icon.CircleFilled];

const getDeviceIcon = (
  device: BluetoothDevice,
  actionInProgress: string,
  isScanning: boolean,
  scanningAnimation: number,
) => {
  if (actionInProgress === device.address) return Icon.Clock;
  if (isScanning) return SCANNING_ICONS[scanningAnimation];
  return device.connected ? Icon.CircleFilled : Icon.Circle;
};

const getAccessoryIcon = (device: BluetoothDevice, actionInProgress: string) => {
  if (actionInProgress === device.address) return Icon.Clock;
  if (device.connected) return Icon.CheckCircle;
  return undefined;
};

const getDeviceStatus = (device: BluetoothDevice, actionInProgress: string) => {
  if (actionInProgress === device.address) {
    return "Working...";
  }
  if (device.connected) {
    return "Connected";
  }
  return "Disconnected";
};
