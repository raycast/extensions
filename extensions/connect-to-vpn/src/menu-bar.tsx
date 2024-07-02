import { MenuBarExtra, Icon, showToast, Toast } from "@raycast/api";
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
  } = useNetworkServices();

  if (error) {
    showToast(Toast.Style.Failure, "Something went wrong", error.message);
  }

  return (
    <MenuBarExtra icon={Icon.Network} tooltip="Network Services" isLoading={isLoading}>
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
