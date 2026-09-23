import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { WifiDetail } from "./components/WifiDetail";
import { ConnectPasswordForm } from "./components/ConnectPasswordForm";
import {
  connectWifi,
  disconnectWifi,
  forgetWifiNetwork,
  getInternetSpeed,
  getWifiNetworks,
  getWifiPassword,
  getWifiStatus,
  openAvailableNetworks,
  openWifiSettings,
  toggleWifi,
} from "./services/wifiService";
import { WifiNetwork, WifiStatus } from "./services/types";
import { SHORTCUTS } from "./utils/shortcuts";
import { isEnterpriseAuth, isLatestSsidRequest } from "./utils/wifiState";

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
  const connectedSsidRef = useRef<string | undefined>(undefined);
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
              (currentStatus.isConnected && prev.ssid === currentStatus.ssid
                ? prev.internetSpeed
                : undefined),
          };
          return areWifiStatusesEqual(prev, mergedStatus) ? prev : mergedStatus;
        });
        setNetworks((prev) =>
          areWifiNetworksEqual(prev, networkList) ? prev : networkList,
        );

        if (currentStatus.isConnected && currentStatus.ssid) {
          const activeSsid = currentStatus.ssid;
          if (connectedSsidRef.current !== activeSsid) {
            connectedSsidRef.current = activeSsid;
            queriedPasswordSsidRef.current = undefined;
            setSavedPassword(undefined);
          }

          if (activeSsid !== queriedPasswordSsidRef.current) {
            queriedPasswordSsidRef.current = activeSsid;
            getWifiPassword(activeSsid).then((pwd) => {
              if (
                !isMountedRef.current ||
                currentSeq !== actionSeqRef.current ||
                !isLatestSsidRequest(
                  activeSsid,
                  connectedSsidRef.current,
                  queriedPasswordSsidRef.current,
                )
              )
                return;
              setSavedPassword(pwd);
            });
          }

          if (currentStatus.ssid !== speedTestedSsidRef.current) {
            speedTestedSsidRef.current = currentStatus.ssid;
            setStatus((prev) => ({ ...prev, isTestingSpeed: true }));
            getInternetSpeed(activeSsid).then((speed) => {
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
          connectedSsidRef.current = undefined;
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
      refresh();
    } finally {
      isActionInProgressRef.current = false;
    }
  }

  async function handleJoinEnterprise() {
    await openAvailableNetworks();
    await showToast({
      style: Toast.Style.Success,
      title: "Finish sign-in in the Windows network list",
      message: "802.1X networks can be reconnected here once saved",
    });
  }

  async function handleConnect(network: WifiNetwork) {
    actionSeqRef.current++;
    isActionInProgressRef.current = true;
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
      refresh();
    } finally {
      isActionInProgressRef.current = false;
    }
  }

  async function handleDisconnect() {
    actionSeqRef.current++;
    isActionInProgressRef.current = true;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Disconnecting from Wi-Fi...",
    });
    try {
      await disconnectWifi();
      if (!isMountedRef.current) return;
      setStatus((prev) => ({
        ...prev,
        isConnected: false,
        sessionData: undefined,
      }));
      toast.style = Toast.Style.Success;
      toast.title = "Disconnected from Wi-Fi";
      scheduleTimeout(() => refresh(), 1500);
    } catch (error) {
      if (!isMountedRef.current) return;
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to disconnect";
      toast.message = error instanceof Error ? error.message : String(error);
      refresh();
    } finally {
      isActionInProgressRef.current = false;
    }
  }

  async function handleForgetNetwork(network: WifiNetwork) {
    if (isActionInProgressRef.current) return;
    const confirmed = await confirmAlert({
      title: `Forget "${network.ssid}"?`,
      message:
        "This will remove the saved network. You'll need to enter the password again to reconnect.",
      primaryAction: {
        title: "Forget Network",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    actionSeqRef.current++;
    isActionInProgressRef.current = true;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Forgetting "${network.ssid}"...`,
    });

    try {
      await forgetWifiNetwork(network.ssid);
      if (!isMountedRef.current) return;
      toast.style = Toast.Style.Success;
      toast.title = `Forgot "${network.ssid}"`;
      if (network.isConnected) {
        setStatus((prev) => ({
          ...prev,
          isConnected: false,
          sessionData: undefined,
        }));
      }
      refresh();
    } catch (error) {
      if (!isMountedRef.current) return;
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to forget "${network.ssid}"`;
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      isActionInProgressRef.current = false;
    }
  }

  async function handleTestSpeed() {
    const activeSsid = status.ssid;
    if (!status.isConnected || !activeSsid) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Connect to Wi-Fi before testing speed",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Testing Internet Speed...",
    });
    setStatus((prev) => ({ ...prev, isTestingSpeed: true }));
    try {
      const speed = await getInternetSpeed(activeSsid, true);
      if (!isMountedRef.current) return;
      if (speed && connectedSsidRef.current === activeSsid) {
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
                shortcut={SHORTCUTS.openSettings}
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
                shortcut={SHORTCUTS.refresh}
              />
              <Action
                title="Turn Wi-fi Off"
                icon={Icon.Power}
                onAction={handleToggleWifi}
                shortcut={SHORTCUTS.toggleRadio}
              />
              <Action
                title="Open Wi-fi Settings"
                icon={Icon.Gear}
                onAction={openWifiSettings}
                shortcut={SHORTCUTS.openSettings}
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
                          shortcut={SHORTCUTS.copyPassword}
                        />
                      )}
                      <Action
                        title="Test Internet Speed"
                        icon={Icon.Gauge}
                        shortcut={SHORTCUTS.testSpeed}
                        onAction={handleTestSpeed}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Network Details">
                      {status.ipAddress && (
                        <Action.CopyToClipboard
                          title="Copy Ip Address"
                          content={status.ipAddress}
                          icon={Icon.Clipboard}
                          shortcut={SHORTCUTS.copyDetails}
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
                    {connectedNetwork.isSaved && (
                      <ActionPanel.Section>
                        <Action
                          title="Forget Network"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={() => handleForgetNetwork(connectedNetwork)}
                        />
                      </ActionPanel.Section>
                    )}
                    <ActionPanel.Section title="Controls">
                      <Action
                        title="Turn Wi-fi Off"
                        icon={Icon.Power}
                        onAction={handleToggleWifi}
                        shortcut={SHORTCUTS.toggleRadio}
                      />
                      <Action
                        title="Open Wi-fi Settings"
                        icon={Icon.Gear}
                        onAction={openWifiSettings}
                        shortcut={SHORTCUTS.openSettings}
                      />
                      <Action
                        title="Refresh List"
                        icon={Icon.ArrowClockwise}
                        onAction={() => refresh(true)}
                        shortcut={SHORTCUTS.refresh}
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
                      {status.isConnected && (
                        <Action
                          title="Test Internet Speed"
                          icon={Icon.Gauge}
                          shortcut={SHORTCUTS.testSpeed}
                          onAction={handleTestSpeed}
                        />
                      )}
                      <Action
                        title="Forget Network"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => handleForgetNetwork(net)}
                      />
                      <Action
                        title="Turn Wi-fi Off"
                        icon={Icon.Power}
                        onAction={handleToggleWifi}
                        shortcut={SHORTCUTS.toggleRadio}
                      />
                      <Action
                        title="Open Wi-fi Settings"
                        icon={Icon.Gear}
                        onAction={openWifiSettings}
                        shortcut={SHORTCUTS.openSettings}
                      />
                      <Action
                        title="Refresh List"
                        icon={Icon.ArrowClockwise}
                        onAction={() => refresh(true)}
                        shortcut={SHORTCUTS.refresh}
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
                const isEnterprise = isEnterpriseAuth(net.authentication);
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
                        {isEnterprise ? (
                          <Action
                            title="Join Enterprise Network"
                            icon={Icon.Key}
                            onAction={handleJoinEnterprise}
                          />
                        ) : isEncrypted ? (
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
                        {status.isConnected && (
                          <Action
                            title="Test Internet Speed"
                            icon={Icon.Gauge}
                            shortcut={SHORTCUTS.testSpeed}
                            onAction={handleTestSpeed}
                          />
                        )}
                        <Action
                          title="Turn Wi-fi Off"
                          icon={Icon.Power}
                          onAction={handleToggleWifi}
                          shortcut={SHORTCUTS.toggleRadio}
                        />
                        <Action
                          title="Open Wi-fi Settings"
                          icon={Icon.Gear}
                          onAction={openWifiSettings}
                          shortcut={SHORTCUTS.openSettings}
                        />
                        <Action
                          title="Refresh List"
                          icon={Icon.ArrowClockwise}
                          onAction={() => refresh(true)}
                          shortcut={SHORTCUTS.refresh}
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
                      {status.isConnected && (
                        <Action
                          title="Test Internet Speed"
                          icon={Icon.Gauge}
                          shortcut={SHORTCUTS.testSpeed}
                          onAction={handleTestSpeed}
                        />
                      )}
                      <Action
                        title="Forget Network"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => handleForgetNetwork(net)}
                      />
                      <Action
                        title="Turn Wi-fi Off"
                        icon={Icon.Power}
                        onAction={handleToggleWifi}
                        shortcut={SHORTCUTS.toggleRadio}
                      />
                      <Action
                        title="Open Wi-fi Settings"
                        icon={Icon.Gear}
                        onAction={openWifiSettings}
                        shortcut={SHORTCUTS.openSettings}
                      />
                      <Action
                        title="Refresh List"
                        icon={Icon.ArrowClockwise}
                        onAction={() => refresh(true)}
                        shortcut={SHORTCUTS.refresh}
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
