import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { WakeData, NetworkInfo } from "./types";
import { wake } from "./lib/wol";
import WakeDataForm from "./components/WakeDataForm";
import { enhancedPing } from "./lib/enhanced-ping";
import { useLocalStorage } from "@raycast/utils";

const Shortcut = Keyboard.Shortcut;

// Ping interval in milliseconds (default: 8 seconds)
// You can adjust this value to ping more/less frequently
const PING_INTERVAL = 8000;

export default function Command() {
  const {
    value: devices = [],
    setValue: setDevices,
    isLoading: isLoadingDevices,
  } = useLocalStorage<WakeData[]>("wakeDatasets", []);
  const [networkInfoMap, setNetworkInfoMap] = useState<Map<string, NetworkInfo>>(new Map());
  const [isInitialPingComplete, setIsInitialPingComplete] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const networkInfoMapRef = useRef<Map<string, NetworkInfo>>(new Map());
  const isPingingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep ref in sync with state
  networkInfoMapRef.current = networkInfoMap;

  // Combined loading state: loading devices OR doing any ping operation
  const isLoading = isLoadingDevices || (!isInitialPingComplete && devices.length > 0) || isPinging;

  const ping = useCallback((devicesData: WakeData[]) => {
    // Prevent overlapping ping operations
    if (isPingingRef.current) {
      return;
    }

    isPingingRef.current = true;
    setIsPinging(true);

    (async () => {
      const map = new Map<string, NetworkInfo>();
      for (const device of devicesData) {
        // Get previous lastSeen to preserve for offline devices
        const previousInfo = networkInfoMapRef.current.get(device.ip);
        const networkInfo = await enhancedPing(device.ip, device.mac, previousInfo?.lastSeen);
        map.set(device.ip, networkInfo);
      }
      setNetworkInfoMap(map);
      isPingingRef.current = false;
      setIsPinging(false);
      // Mark initial ping as complete
      setIsInitialPingComplete(true);
    })();
  }, []);

  // Initial ping and setup periodic pinging
  useEffect(() => {
    if (!devices || devices.length === 0) {
      // Clear interval if no devices
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsInitialPingComplete(true); // No devices to ping
      return;
    }

    // Reset initial ping completion when devices change
    setIsInitialPingComplete(false);

    // Initial ping
    ping(devices);

    // Setup periodic pinging
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      ping(devices);
    }, PING_INTERVAL);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [devices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const handleDelete = useCallback(
    (index: number) => {
      if (devices) {
        devices.splice(index, 1);
        setDevices([...devices]);
      }
    },
    [devices],
  );

  const handleUpdate = useCallback(
    (index: number, value: WakeData) => {
      devices[index] = value;
      setDevices([...devices]);
    },
    [devices],
  );

  const handleCreate = useCallback(
    (value: WakeData) => {
      setDevices([...devices, value]);
    },
    [devices],
  );

  // Manual refresh function
  const handleManualRefresh = useCallback(() => {
    if (!devices || devices.length === 0) return;
    ping(devices);
  }, [devices]);

  return (
    <List isLoading={isLoading} isShowingDetail={devices.length > 0} searchBarPlaceholder="Search devices...">
      <List.EmptyView
        title="Add a new device"
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Device"
              icon={Icon.Plus}
              shortcut={Shortcut.Common.New}
              target={<WakeDataForm upsert={handleCreate} />}
            />
          </ActionPanel>
        }
      />
      {devices.map((item, index) => (
        <List.Item
          key={index}
          icon={Icon.ComputerChip}
          title={item.name}
          keywords={[item.mac, item.name]}
          accessories={[
            networkInfoMap.has(item.ip)
              ? {
                  tag: {
                    value: `${(networkInfoMap.get(item.ip)?.isOnline && "Online") || "Offline"}`,
                    color: networkInfoMap.get(item.ip)?.isOnline ? Color.Green : Color.Yellow,
                  },
                }
              : { tag: { value: "Checking..", color: Color.Orange } },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Wake"
                icon={Icon.Play}
                onAction={async () => {
                  wake(item.mac, { port: parseInt(item.port) });
                  await showToast({ title: "Order acknowledged!", message: "For the Swarm" });
                }}
              />
              <Action.CopyToClipboard title="Copy Mac Address" content={item.mac} shortcut={Shortcut.Common.Copy} />
              <Action
                title="Refresh Status"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={handleManualRefresh}
              />
              <Action.Push
                title="Add Device"
                icon={Icon.Plus}
                shortcut={Shortcut.Common.New}
                target={<WakeDataForm upsert={handleCreate} />}
              />
              <Action.Push
                title="Modify Device"
                icon={Icon.CircleEllipsis}
                shortcut={Shortcut.Common.Edit}
                target={
                  <WakeDataForm
                    upsert={(v) => {
                      handleUpdate(index, v);
                    }}
                    initial={item}
                  />
                }
              />
              <Action
                title="Remove Device"
                style={Action.Style.Destructive}
                shortcut={Shortcut.Common.Remove}
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                onAction={() => handleDelete(index)}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={(() => {
                const networkInfo = networkInfoMap.get(item.ip);

                // Check if sections have content
                const hasHardwareInfo = networkInfo?.detectedOS || networkInfo?.ttl;

                return (
                  <List.Item.Detail.Metadata>
                    {/* Basic Device Info */}
                    <List.Item.Detail.Metadata.Label title="Device Name" text={item.name} />
                    <List.Item.Detail.Metadata.Separator />

                    {/* Network Identification */}
                    <List.Item.Detail.Metadata.Label title="MAC Address" text={item.mac} />
                    <List.Item.Detail.Metadata.Label title="IP Address" text={item.ip} />
                    {networkInfo?.hostname && (
                      <List.Item.Detail.Metadata.Label title="Hostname" text={networkInfo.hostname} />
                    )}
                    <List.Item.Detail.Metadata.Label title="WOL Port" text={item.port} />

                    {/* Hardware Info - Only show separator if there's content */}
                    {hasHardwareInfo && <List.Item.Detail.Metadata.Separator />}
                    {networkInfo?.detectedOS && (
                      <List.Item.Detail.Metadata.Label title="Detected OS" text={networkInfo.detectedOS} />
                    )}
                    {networkInfo?.ttl && (
                      <List.Item.Detail.Metadata.Label title="TTL" text={networkInfo.ttl.toString()} />
                    )}

                    {/* Connection Status - Always show separator since status is always present */}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Status"
                      text={networkInfo?.isOnline ? "🟢 Online" : "🔴 Offline"}
                    />
                    {networkInfo?.latency && (
                      <List.Item.Detail.Metadata.Label
                        title="Response Time"
                        text={`${networkInfo.latency.toFixed(1)}ms`}
                      />
                    )}
                    {networkInfo?.quality && (
                      <List.Item.Detail.Metadata.Label
                        title="Connection Quality"
                        text={
                          networkInfo.quality === "excellent"
                            ? "🟢 Excellent"
                            : networkInfo.quality === "good"
                              ? "🟡 Good"
                              : "🔴 Poor"
                        }
                      />
                    )}
                    {networkInfo?.packetLoss !== undefined && (
                      <List.Item.Detail.Metadata.Label title="Packet Loss" text={`${networkInfo.packetLoss}%`} />
                    )}
                    {networkInfo?.lastSeen && (
                      <List.Item.Detail.Metadata.Label title="Last Seen" text={networkInfo.lastSeen.toLocaleString()} />
                    )}
                  </List.Item.Detail.Metadata>
                );
              })()}
            />
          }
        />
      ))}
    </List>
  );
}
