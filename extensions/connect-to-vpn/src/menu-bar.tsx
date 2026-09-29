import { MenuBarExtra, Color } from "@raycast/api";
import {
  NetworkService,
  normalizeHardwarePort,
  openNetworkSettings,
  transitionLabel,
  useNetworkServices,
} from "./network-services";
import { useEffect } from "react";
import { getMenuBarRefreshTimestamp } from "./store";

export default function Command() {
  const {
    isLoading,
    favoriteServices,
    invalidServices,
    otherServices,
    getActionForService,
    hideInvalidDevices,
    refreshServices,
    refreshServicesFromAction,
    error,
  } = useNetworkServices();

  const connectedServices = [...favoriteServices, ...otherServices].filter((service) => service.status === "connected");
  const isConnected = connectedServices.length > 0;
  const tooltip = isLoading
    ? "Checking VPN status…"
    : error
      ? "Unable to refresh VPN status"
      : isConnected
        ? `Connected to ${connectedServices.map((service) => service.name).join(", ")}`
        : "No VPN connected";

  useEffect(() => {
    let cancelled = false;
    let checking = false;
    let lastTimestamp: number | undefined;
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const timestamp = await getMenuBarRefreshTimestamp();
        if (cancelled) return;
        if (lastTimestamp === undefined) {
          lastTimestamp = timestamp;
        } else if (timestamp > lastTimestamp && (await refreshServices()) === "refreshed") {
          lastTimestamp = timestamp;
        }
      } catch (err) {
        console.error("Unable to check for VPN updates:", err);
      } finally {
        checking = false;
      }
    };
    void check();
    const timer = setInterval(check, 500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [refreshServices]);

  return (
    <MenuBarExtra
      icon={{
        source: isConnected ? "network-connected.png" : "network-disconnected.png",
        tintColor: Color.PrimaryText,
      }}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      {error && <MenuBarExtra.Item title="Network Service Error" subtitle={error.message} />}
      {!isLoading &&
        !error &&
        favoriteServices.length === 0 &&
        otherServices.length === 0 &&
        (hideInvalidDevices || invalidServices.length === 0) && <MenuBarExtra.Item title="No VPN Services Found" />}
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
        <MenuBarExtra.Item title="Refresh Status" onAction={refreshServicesFromAction} />
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
        subtitle={transitionLabel(service.status) ?? normalizeHardwarePort(service.hardwarePort, service.name)}
        onAction={actionDetails.action}
      />
    );
  }
}
