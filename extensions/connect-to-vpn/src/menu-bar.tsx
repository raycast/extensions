import { MenuBarExtra, showToast, Toast, environment, LaunchType } from "@raycast/api";
import { NetworkService, normalizeHardwarePort, openNetworkSettings, useNetworkServices } from "./network-services";

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

  // Check the launch type to determine if it's a background refresh
  if (environment.launchType === LaunchType.Background) {
    // Perform background refresh logic
    refreshNetworkStatus();
  }

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

  function refreshNetworkStatus() {
    // Refresh the status of each service
    [...favoriteServices, ...otherServices, ...(!hideInvalidDevices ? invalidServices : [])].forEach((service) => {
      fetchServiceStatus(service);
    });
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
