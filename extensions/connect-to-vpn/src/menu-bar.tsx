import { MenuBarExtra, environment, Color, LaunchType } from "@raycast/api";
import {
  NetworkService,
  normalizeHardwarePort,
  openNetworkSettings,
  transitionLabel,
  useNetworkServices,
} from "./network-services";
import { useRef, useEffect, useState } from "react";
import { getVpnStatus, getMenuBarRefreshTimestamp } from "./store";

export default function Command() {
  const {
    isLoading,
    favoriteServices,
    invalidServices,
    otherServices,
    getActionForService,
    hideInvalidDevices,
    fetchServiceStatus,
  } = useNetworkServices();

  // Indicates, if we need to keep background process running
  const [isBackgroundRunning, setIsBackgroundRunning] = useState(environment.launchType === LaunchType.Background);
  const isChecking = useRef(false);

  // State to track the last refresh timestamp. null until the first check has read what is
  // already stored, so a stale timestamp from an earlier run is not mistaken for a new signal.
  const [lastRefreshTimestamp, setLastRefreshTimestamp] = useState<number | null>(null);
  const refreshCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Track if we need to force refresh all services
  const [needsFullRefresh, setNeedsFullRefresh] = useState(false);

  // State to track the current connection status
  const [isConnected, setIsConnected] = useState(false);

  // Check connection status immediately when services load
  useEffect(() => {
    if (!isLoading) {
      const connected = [...favoriteServices, ...otherServices, ...(!hideInvalidDevices ? invalidServices : [])].some(
        (s) => s.status === "connected",
      );
      setIsConnected(connected);
    }
  }, [favoriteServices, otherServices, invalidServices, isLoading, hideInvalidDevices]);

  useEffect(() => {
    if (environment.launchType === LaunchType.Background) {
      // Run these conditions only in background mode
      if (!isLoading) {
        startRefresh();
      }
    }
  }, [environment.launchType, isLoading]);

  // Effect to check for refresh timestamp changes and VPN status updates
  useEffect(() => {
    if (isLoading) return;

    const checkForUpdates = async () => {
      try {
        // Check for timestamp updates
        const timestamp = await getMenuBarRefreshTimestamp();

        if (lastRefreshTimestamp === null) {
          // Whatever is stored now is where this run starts from. The command already loaded fresh
          // status on launch, so acting on it would only repeat that work.
          setLastRefreshTimestamp(timestamp);
          return;
        }

        if (timestamp > lastRefreshTimestamp) {
          console.log(`Refresh signal detected: ${new Date(timestamp).toISOString()}`);
          setLastRefreshTimestamp(timestamp);

          // Check for VPN status directly
          const status = await getVpnStatus();
          if (status) {
            console.log(`VPN status update: ${status.serviceId} is ${status.status}`);

            // Update the connection status immediately
            const allServices = [
              ...favoriteServices,
              ...otherServices,
              ...(!hideInvalidDevices ? invalidServices : []),
            ];
            const updatedServices = allServices.map((s) =>
              s.id === status.serviceId ? { ...s, status: status.status } : s,
            );

            const connected = updatedServices.some((s) => s.status === "connected");
            setIsConnected(connected);

            // Also refresh all services to ensure UI is consistent
            setNeedsFullRefresh(true);
          }
        }
      } catch (err) {
        console.error("Error checking for updates:", err);
      }
    };

    // Check frequently (500ms for fast response)
    refreshCheckInterval.current = setInterval(checkForUpdates, 500);

    return () => {
      if (refreshCheckInterval.current) {
        clearInterval(refreshCheckInterval.current);
        refreshCheckInterval.current = null;
      }
    };
  }, [isLoading, lastRefreshTimestamp, favoriteServices, otherServices, invalidServices, hideInvalidDevices]);

  // Effect to perform the actual refresh when needed
  useEffect(() => {
    if (needsFullRefresh && !isLoading) {
      const performRefresh = async () => {
        console.log("Performing full refresh of all services");
        await refreshAllServices();
        setNeedsFullRefresh(false);
      };

      performRefresh();
    }
  }, [needsFullRefresh, isLoading]);

  // Function to refresh all services
  const refreshAllServices = async () => {
    const allServices = [...favoriteServices, ...otherServices, ...(!hideInvalidDevices ? invalidServices : [])];
    console.log(`Refreshing all ${allServices.length} services`);

    for (const service of allServices) {
      try {
        await fetchServiceStatus(service);
      } catch (err) {
        console.error(`Error refreshing service ${service.name}:`, err);
      }
    }
  };

  const startRefresh = async () => {
    if (!isChecking.current) {
      console.log("Attempting to start network status refresh");
      isChecking.current = true;
      try {
        console.log("Starting network status refresh");
        await refreshNetworkStatus();
        console.log("Successfully finished network status refresh");
      } catch (err) {
        console.error("Error during network status refresh:", err);
      } finally {
        console.log("Resetting isChecking flag");
        isChecking.current = false;
        setIsBackgroundRunning(false);
      }
    } else {
      console.log("Refresh already in progress, skipping...");
    }
  };

  return (
    <MenuBarExtra
      icon={{
        source: isConnected ? "network-connected.png" : "network-disconnected.png",
        tintColor: Color.PrimaryText,
      }}
      tooltip="Network Services"
      isLoading={isLoading || isBackgroundRunning || needsFullRefresh}
    >
      {favoriteServices.length > 0 && (
        <MenuBarExtra.Section title="Favorites">
          {favoriteServices.map((service) => (
            <NetworkServiceItem key={service.id} service={service} />
          ))}
        </MenuBarExtra.Section>
      )}
      {otherServices.length > 0 && (
        <MenuBarExtra.Section title="VPN Services">
          {otherServices.map((service) => (
            <NetworkServiceItem key={service.id} service={service} />
          ))}
        </MenuBarExtra.Section>
      )}
      {!hideInvalidDevices && invalidServices.length > 0 && (
        <MenuBarExtra.Section title="Other Services">
          {invalidServices.map((service) => (
            <NetworkServiceItem key={service.id} service={service} />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Refresh Status" onAction={refreshAllServices} />
        <MenuBarExtra.Item title="Open Network Settings…" onAction={openNetworkSettings} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );

  async function refreshNetworkStatus() {
    const startTime = Date.now();
    console.log(`Starting network status refresh at ${new Date(startTime).toISOString()}`);
    const services = [...favoriteServices, ...otherServices, ...(!hideInvalidDevices ? invalidServices : [])];
    console.log(`Number of services to refresh: ${services.length}`);

    if (services.length === 0) {
      console.log("No services to refresh, skipping...");
      return;
    }

    try {
      for (const service of services) {
        console.log(`Fetching status for service: ${service.name}`);
        const status = await fetchServiceStatus(service);
        console.log(`Fetched status for ${service.name}: ${status}`);
      }
    } catch (err) {
      console.error("Error refreshing network status:", err);
    }
    const endTime = Date.now();
    console.log(`Finished network status refresh at ${new Date(endTime).toISOString()}`);
    console.log(`Duration: ${endTime - startTime}ms`);
  }

  function NetworkServiceItem({ service }: { service: NetworkService }) {
    const actionDetails = getActionForService(service);

    return (
      <MenuBarExtra.Item
        icon={actionDetails.icon}
        title={service.name}
        subtitle={transitionLabel(service.status) ?? normalizeHardwarePort(service.hardwarePort, service.name)}
        onAction={actionDetails.action}
      />
    );
  }
}
