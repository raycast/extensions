import { MenuBarExtra, showToast, Toast, environment, LaunchType } from "@raycast/api";
import { NetworkService, normalizeHardwarePort, openNetworkSettings, useNetworkServices } from "./network-services";
import { useRef, useEffect } from "react";

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

  const isChecking = useRef(false);

  useEffect(() => {
    if (environment.launchType === LaunchType.Background) {
      startRefresh();
    }
  }, [environment.launchType, favoriteServices, otherServices, invalidServices]);

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
      isLoading={isLoading}
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
