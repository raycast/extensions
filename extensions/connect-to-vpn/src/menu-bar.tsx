import { MenuBarExtra, showToast, Toast, environment, LaunchType } from "@raycast/api";
import { NetworkService, normalizeHardwarePort, openNetworkSettings, useNetworkServices } from "./network-services";
import { useRef, useEffect, useState } from "react";

export default function Command() {
  const {
    isLoading,
    error,
    favoriteServices,
    invalidServices,
    otherServices,
    getActionForService,
    hideInvalidDevices,
    fetchServiceStatus,
  } = useNetworkServices();

  // Indicates, if we need to keep background process running
  // Sets false when `startRefresh` ends
  const [isBackgroundRunning, setIsBackgroundRunning] = useState(environment.launchType === LaunchType.Background);
  const isChecking = useRef(false);

  useEffect(() => {
    if (environment.launchType === LaunchType.Background) {
      // Run these conditions only in background mode

      // If all services are loaded in useNetworkServices - start refreshing
      if (!isLoading) {
        startRefresh();
      }
    }

    // Check services array's length because of state changing in `fetchServiceStatus` function
    // That function changes `networkServices` state and updates whole effect, if we shallow check array memory address
  }, [environment.launchType, favoriteServices.length, otherServices.length, invalidServices.length, isLoading]);

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

        // Stop running background process
        setIsBackgroundRunning(false);
      }
    } else {
      console.log("Refresh already in progress, skipping...");
    }
  };

  if (error) {
    showToast(Toast.Style.Failure, "Something went wrong", error.message);
  }

  const isConnected = [...favoriteServices, ...otherServices, ...(!hideInvalidDevices ? invalidServices : [])].some(
    (s) => s.status === "connected",
  );

  return (
    <MenuBarExtra
      icon={isConnected ? "network-connected.png" : "network-disconnected.png"}
      tooltip="Network Services"
      isLoading={isLoading || isBackgroundRunning}
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
        subtitle={normalizeHardwarePort(service.hardwarePort, service.name)}
        onAction={actionDetails.action}
      />
    );
  }
}
