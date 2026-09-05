import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { WifiDetail } from "./components/WifiDetail";
import { ConnectPasswordForm } from "./components/ConnectPasswordForm";
import {
  clearSessionBaseline,
  connectWifi,
  disconnectWifi,
  getInternetSpeed,
  getWifiNetworks,
  getWifiPassword,
  getWifiStatus,
  openWifiSettings,
  toggleWifi,
} from "./services/wifiService";
import { WifiNetwork, WifiStatus } from "./services/types";

function areWifiStatusesEqual(a: WifiStatus, b: WifiStatus): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function areWifiNetworksEqual(a: WifiNetwork[], b: WifiNetwork[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function WifiCommand() {
  const [status, setStatus] = useState<WifiStatus>({
    isOn: true,
    isConnected: false,
  });
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [savedPassword, setSavedPassword] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const isMountedRef = useRef(true);
  const isScanningRef = useRef(false);
  const isActionInProgressRef = useRef(false);
  const actionSeqRef = useRef(0);
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const pendingRefreshRef = useRef<{ showNotification?: boolean } | null>(null);
  const queriedPasswordSsidRef = useRef<string | undefined>(undefined);
  const speedTestedSsidRef = useRef<string | undefined>(undefined);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    if (!isMountedRef.current) return;
    const id = setTimeout(() => {
      timeoutsRef.current.delete(id);
      if (isMountedRef.current) {
        fn();
      }
    }, ms);
    timeoutsRef.current.add(id);
    return id;
  }, []);

  const refresh = useCallback(
    async (
      options?:
        | boolean
        | {
            showNotification?: boolean;
            isBackground?: boolean;
            activeScan?: boolean;
          },
    ) => {
      const showNotification =
        typeof options === "boolean"
          ? options
          : Boolean(options?.showNotification);
      const isBackground =
        typeof options === "object" ? Boolean(options?.isBackground) : false;
      const activeScan =
        typeof options === "object" && options.activeScan !== undefined
          ? options.activeScan
          : true;

      if (!isMountedRef.current) return;

      // Skip background periodic ticks while an action (toggle/connect/disconnect) is running
      if (isBackground && isActionInProgressRef.current) {
        return;
      }

      if (isScanningRef.current) {
        if (!isBackground) {
          pendingRefreshRef.current = {
            showNotification:
              showNotification || pendingRefreshRef.current?.showNotification,
          };
        }
        return;
      }

      isScanningRef.current = true;
      const currentSeq = actionSeqRef.current;
      if (!isBackground) {
        setIsLoading(true);
      }

      try {
        const [currentStatus, networkList] = await Promise.all([
          getWifiStatus(),
          getWifiNetworks(activeScan),
        ]);

        if (!isMountedRef.current || currentSeq !== actionSeqRef.current)
          return;

        setStatus((prev) => {
          const mergedStatus: WifiStatus = {
            ...currentStatus,
            isTestingSpeed: prev.isTestingSpeed,
            internetSpeed:
              currentStatus.internetSpeed ??
              (currentStatus.isConnected ? prev.internetSpeed : undefined),
          };
          return areWifiStatusesEqual(prev, mergedStatus) ? prev : mergedStatus;
        });
        setNetworks((prev) =>
          areWifiNetworksEqual(prev, networkList) ? prev : networkList,
        );

        if (currentStatus.isConnected && currentStatus.ssid) {
          const activeSsid = currentStatus.ssid;
          if (activeSsid !== queriedPasswordSsidRef.current) {
            queriedPasswordSsidRef.current = activeSsid;
            getWifiPassword(activeSsid).then((pwd) => {
              if (!isMountedRef.current || currentSeq !== actionSeqRef.current)
                return;
              setSavedPassword(pwd);
            });
          }

          if (currentStatus.ssid !== speedTestedSsidRef.current) {
            speedTestedSsidRef.current = currentStatus.ssid;
            setStatus((prev) => ({ ...prev, isTestingSpeed: true }));
            getInternetSpeed().then((speed) => {
              if (!isMountedRef.current || currentSeq !== actionSeqRef.current)
                return;
              setStatus((prev) =>
                prev.isConnected && prev.ssid === currentStatus.ssid
                  ? { ...prev, isTestingSpeed: false, internetSpeed: speed }
                  : { ...prev, isTestingSpeed: false },
              );
            });
          }
        } else {
          queriedPasswordSsidRef.current = undefined;
          setSavedPassword(undefined);
          speedTestedSsidRef.current = undefined;
        }

        if (showNotification && !isBackground) {
          await showToast({
            style: Toast.Style.Success,
            title: "Wi-Fi refreshed",
          });
        }
      } catch (error) {
        if (!isMountedRef.current || currentSeq !== actionSeqRef.current)
          return;
        if (!isBackground) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to query Wi-Fi",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        isScanningRef.current = false;
        if (isMountedRef.current && !isBackground) {
          setIsLoading(false);
        }

        if (isMountedRef.current && pendingRefreshRef.current) {
          const pending = pendingRefreshRef.current;
          pendingRefreshRef.current = null;
          refresh(pending);
        }
      }
    },
    [],
  );

  useEffect(() => {
    isMountedRef.current = true;
    // Fast initial load using cached scan (~200ms)
    refresh({ isBackground: false, activeScan: false });

    // Background active hardware probe scan
    const initialScanTimeout = setTimeout(() => {
      refresh({ isBackground: true, activeScan: true });
    }, 1200);

    // Periodic 10-second active hardware scan while window is open
    const intervalId = setInterval(() => {
      refresh({ isBackground: true, activeScan: true });
    }, 10000);

    return () => {
      isMountedRef.current = false;
      clearTimeout(initialScanTimeout);
      clearInterval(intervalId);
      for (const id of timeoutsRef.current) {
        clearTimeout(id);
      }
      timeoutsRef.current.clear();
    };
  }, [refresh]);

  async function handleToggleWifi() {
    actionSeqRef.current++;
    isActionInProgressRef.current = true;
    clearSessionBaseline();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${status.isOn ? "Turning Wi-Fi Off..." : "Turning Wi-Fi On..."}`,
    });
    try {
      const newState = await toggleWifi(!status.isOn);
      if (!isMountedRef.current) return;
      setStatus((prev) => ({
        ...prev,
        isOn: newState,
        isConnected: newState ? prev.isConnected : false,
        sessionData: newState ? prev.sessionData : undefined,
      }));
      toast.style = Toast.Style.Success;
      toast.title = `Wi-Fi turned ${newState ? "ON" : "OFF"}`;
      scheduleTimeout(() => refresh(), 1500);
    } catch (error) {
      if (!isMountedRef.current) return;
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to toggle Wi-Fi";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      isActionInProgressRef.current = false;
    }
  }

  async function handleConnect(network: WifiNetwork) {
    actionSeqRef.current++;
    isActionInProgressRef.current = true;
    clearSessionBaseline(network.ssid);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Connecting to "${network.ssid}"...`,
    });
    try {
      await connectWifi(network.ssid);
      if (!isMountedRef.current) return;
      toast.style = Toast.Style.Success;
      toast.title = `Connected to "${network.ssid}"`;
      scheduleTimeout(() => refresh(), 2000);
    } catch (error) {
      if (!isMountedRef.current) return;
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to connect";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      isActionInProgressRef.current = false;
    }
  }

  async function handleDisconnect() {
    actionSeqRef.current++;
    isActionInProgressRef.current = true;
    clearSessionBaseline();
    setStatus((prev) => ({
      ...prev,
      isConnected: false,
      sessionData: undefined,
    }));
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Disconnecting from Wi-Fi...",
    });
    try {
      await disconnectWifi();
      if (!isMountedRef.current) return;
      toast.style = Toast.Style.Success;
      toast.title = "Disconnected from Wi-Fi";
      scheduleTimeout(() => refresh(), 1500);
    } catch (error) {
      if (!isMountedRef.current) return;
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to disconnect";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      isActionInProgressRef.current = false;
    }
  }

  async function handleTestSpeed() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Testing Internet Speed...",
    });
    setStatus((prev) => ({ ...prev, isTestingSpeed: true }));
    try {
      const speed = await getInternetSpeed(true);
      if (!isMountedRef.current) return;
      if (speed) {
        setStatus((prev) => ({
          ...prev,
          isTestingSpeed: false,
          internetSpeed: speed,
        }));
        toast.style = Toast.Style.Success;
        toast.title = "Internet Speed Tested";
        toast.message = `⬇️ ${speed.downloadMbps} Mbps / ⬆️ ${speed.uploadMbps} Mbps`;
      } else {
        setStatus((prev) => ({ ...prev, isTestingSpeed: false }));
        toast.style = Toast.Style.Failure;
        toast.title = "Speed test unavailable";
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      setStatus((prev) => ({ ...prev, isTestingSpeed: false }));
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to test speed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  const connectedNetwork = networks.find((n) => n.isConnected);
  const savedInRange = networks.filter(
    (n) => n.isSaved && !n.isConnected && n.signalPercent > 0,
  );
  const inRange = networks.filter(
    (n) => !n.isSaved && !n.isConnected && n.signalPercent > 0,
  );
  const savedNotInRange = networks.filter(
    (n) =>
      n.isSaved &&
      !n.isConnected &&
      (!n.signalPercent || n.signalPercent === 0),
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Filter Wi-Fi networks by name or status..."
    >
      {!status.isOn ? (
        <List.EmptyView
          icon={{ source: Icon.Power, tintColor: Color.Red }}
          title="Wi-Fi is Turned Off"
          description="Press Enter to turn Wi-Fi on."
          actions={
            <ActionPanel>
              <Action
                title="Turn Wi-fi On"
                onAction={handleToggleWifi}
                icon={Icon.Power}
              />
              <Action
                title="Open Wi-fi Settings"
                onAction={openWifiSettings}
                icon={Icon.Gear}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </ActionPanel>
          }
        />
      ) : networks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={{ source: Icon.Wifi, tintColor: Color.SecondaryText }}
          title="No Wi-Fi Networks Found"
          description="Ensure your Wi-Fi adapter is active and within range of broadcasting networks."
          actions={
            <ActionPanel>
              <Action
                title="Refresh List"
                icon={Icon.ArrowClockwise}
                onAction={() => refresh(true)}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Turn Wi-fi Off"
                icon={Icon.Power}
                onAction={handleToggleWifi}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <Action
                title="Open Wi-fi Settings"
                icon={Icon.Gear}
                onAction={openWifiSettings}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {connectedNetwork && (
            <List.Section title="Connected Wi-Fi Network">
              <List.Item
                key={connectedNetwork.ssid}
                title={connectedNetwork.ssid}
                subtitle={
                  status.ipAddress ? `IP: ${status.ipAddress}` : "Connected"
                }
                icon={{ source: Icon.Wifi, tintColor: Color.Green }}
                accessories={[
                  {
                    icon: { source: Icon.CheckCircle, tintColor: Color.Green },
                    text: { value: "Connected", color: Color.Green },
                    tooltip: "Connection Status: Connected",
                  },
                  ...(connectedNetwork.signalPercent > 0
                    ? [
                        {
                          tag: {
                            value: `${connectedNetwork.signalPercent}%`,
                            color: Color.Green,
                          },
                          tooltip: "Signal Strength",
                        },
                      ]
                    : []),
                ]}
                detail={
                  <WifiDetail
                    network={connectedNetwork}
                    status={status}
                    savedPassword={savedPassword}
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title="Disconnect"
                        icon={Icon.XMarkCircle}
                        onAction={handleDisconnect}
                      />
                      {savedPassword && (
                        <Action.CopyToClipboard
                          title="Copy Wi-fi Password"
                          content={savedPassword}
                          icon={Icon.Key}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                        />
                      )}
                      <Action
                        title="Test Internet Speed"
                        icon={Icon.Gauge}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                        onAction={handleTestSpeed}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Network Details">
                      {status.ipAddress && (
                        <Action.CopyToClipboard
                          title="Copy Ip Address"
                          content={status.ipAddress}
                          icon={Icon.Clipboard}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                      )}
                      {status.macAddress && (
                        <Action.CopyToClipboard
                          title="Copy Mac Address"
                          content={status.macAddress}
                          icon={Icon.Clipboard}
                        />
                      )}
                      {status.gateway && (
                        <Action.CopyToClipboard
                          title="Copy Gateway Ip"
                          content={status.gateway}
                          icon={Icon.Clipboard}
                        />
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Controls">
                      <Action
                        title="Turn Wi-fi Off"
                        icon={Icon.Power}
                        onAction={handleToggleWifi}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                      />
                      <Action
                        title="Open Wi-fi Settings"
                        icon={Icon.Gear}
                        onAction={openWifiSettings}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                      <Action
                        title="Refresh List"
                        icon={Icon.ArrowClockwise}
                        onAction={() => refresh(true)}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            </List.Section>
          )}

          {savedInRange.length > 0 && (
            <List.Section title="Saved and in Range">
              {savedInRange.map((net) => (
                <List.Item
                  key={net.ssid}
                  title={net.ssid}
                  subtitle={net.authentication || "Saved Network"}
                  icon={{ source: Icon.Wifi, tintColor: Color.Blue }}
                  accessories={[
                    {
                      tag: {
                        value: "Saved",
                        color: Color.Blue,
                      },
                      tooltip: "Saved Network Profile",
                    },
                    {
                      tag: {
                        value: `${net.signalPercent}%`,
                        color: Color.Blue,
                      },
                      tooltip: "Signal Strength",
                    },
                  ]}
                  detail={<WifiDetail network={net} status={status} />}
                  actions={
                    <ActionPanel>
                      <Action
                        title={`Connect to ${net.ssid}`}
                        icon={Icon.Check}
                        onAction={() => handleConnect(net)}
                      />
                      <Action
                        title="Turn Wi-fi Off"
                        icon={Icon.Power}
                        onAction={handleToggleWifi}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                      />
                      <Action
                        title="Open Wi-fi Settings"
                        icon={Icon.Gear}
                        onAction={openWifiSettings}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                      <Action
                        title="Refresh List"
                        icon={Icon.ArrowClockwise}
                        onAction={() => refresh(true)}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {inRange.length > 0 && (
            <List.Section title="In Range">
              {inRange.map((net) => {
                const isEncrypted =
                  net.authentication &&
                  !net.authentication.toLowerCase().includes("open");
                return (
                  <List.Item
                    key={net.ssid}
                    title={net.ssid}
                    subtitle={net.authentication || "Open"}
                    icon={{
                      source: isEncrypted ? Icon.Lock : Icon.Wifi,
                      tintColor: Color.SecondaryText,
                    }}
                    accessories={[
                      {
                        tag: {
                          value: `${net.signalPercent}%`,
                          color: Color.SecondaryText,
                        },
                        tooltip: "Signal Strength",
                      },
                    ]}
                    detail={<WifiDetail network={net} status={status} />}
                    actions={
                      <ActionPanel>
                        {isEncrypted ? (
                          <Action.Push
                            title="Join Network"
                            icon={Icon.Key}
                            target={
                              <ConnectPasswordForm
                                ssid={net.ssid}
                                onConnected={() => refresh()}
                              />
                            }
                          />
                        ) : (
                          <Action
                            title={`Connect to ${net.ssid}`}
                            icon={Icon.Check}
                            onAction={() => handleConnect(net)}
                          />
                        )}
                        <Action
                          title="Turn Wi-fi Off"
                          icon={Icon.Power}
                          onAction={handleToggleWifi}
                          shortcut={{ modifiers: ["cmd"], key: "t" }}
                        />
                        <Action
                          title="Open Wi-fi Settings"
                          icon={Icon.Gear}
                          onAction={openWifiSettings}
                          shortcut={{ modifiers: ["cmd"], key: "o" }}
                        />
                        <Action
                          title="Refresh List"
                          icon={Icon.ArrowClockwise}
                          onAction={() => refresh(true)}
                          shortcut={{ modifiers: ["cmd"], key: "r" }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}

          {savedNotInRange.length > 0 && (
            <List.Section title="Saved but Not in Range">
              {savedNotInRange.map((net) => (
                <List.Item
                  key={net.ssid}
                  title={net.ssid}
                  subtitle="Saved Profile"
                  icon={{
                    source: Icon.SaveDocument,
                    tintColor: Color.SecondaryText,
                  }}
                  accessories={[
                    {
                      tag: {
                        value: "Out of Range",
                        color: Color.SecondaryText,
                      },
                      tooltip: "Not currently broadcasting nearby",
                    },
                  ]}
                  detail={<WifiDetail network={net} status={status} />}
                  actions={
                    <ActionPanel>
                      <Action
                        title={`Connect to ${net.ssid}`}
                        icon={Icon.Check}
                        onAction={() => handleConnect(net)}
                      />
                      <Action
                        title="Turn Wi-fi Off"
                        icon={Icon.Power}
                        onAction={handleToggleWifi}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                      />
                      <Action
                        title="Open Wi-fi Settings"
                        icon={Icon.Gear}
                        onAction={openWifiSettings}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                      <Action
                        title="Refresh List"
                        icon={Icon.ArrowClockwise}
                        onAction={() => refresh(true)}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
