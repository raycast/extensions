import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { NetworkService, normalizeHardwarePort, openNetworkSettings, useNetworkServices } from "./network-services";

export default function Command() {
  const {
    isLoading,
    error,
    favoriteServices,
    invalidServices,
    otherServices,
    fetchServiceStatus,
    addToFavorites,
    removeFromFavorites,
    moveFavoriteUp,
    moveFavoriteDown,
    hideInvalidDevices,
    getActionForService,
  } = useNetworkServices();

  if (error) {
    showToast(Toast.Style.Failure, "Something went wrong", error.message);
  }

  return (
    <List isLoading={isLoading}>
      {favoriteServices.length > 0 && (
        <List.Section title="Favorites">
          {favoriteServices.map((service) => (
            <NetworkServiceItem key={service.id} service={service} />
          ))}
        </List.Section>
      )}

      {otherServices.length > 0 && (
        <List.Section title="VPN Services">
          {otherServices.map((service) => (
            <NetworkServiceItem key={service.id} service={service} />
          ))}
        </List.Section>
      )}

      {!hideInvalidDevices && invalidServices.length > 0 && (
        <List.Section title="Other Services">
          {invalidServices.map((service) => (
            <NetworkServiceItem key={service.id} service={service} />
          ))}
        </List.Section>
      )}
    </List>
  );

  function NetworkServiceItem({ service }: { service: NetworkService }) {
    const actionDetails = getActionForService(service);

    return (
      <List.Item
        icon={actionDetails.icon}
        title={service.name}
        subtitle={normalizeHardwarePort(service.hardwarePort, service.name)}
        accessories={service.favorite ? [{ icon: Icon.Star }] : []}
        actions={
          <ActionPanel>
            {actionDetails.actionName && (
              <Action
                title={actionDetails.actionName}
                onAction={actionDetails.action}
                icon={service.status === "connected" ? Icon.Eject : Icon.Plug}
              />
            )}
            <Action title="Refresh" onAction={() => fetchServiceStatus(service)} icon={Icon.ArrowClockwise} />
            <Action
              title="Open Network Settings"
              onAction={openNetworkSettings}
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            />
            <Action
              title={service.favorite ? "Remove from Favorites" : "Add to Favorites"}
              onAction={() => (service.favorite ? removeFromFavorites(service) : addToFavorites(service))}
              icon={service.favorite ? Icon.Star : Icon.Star}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
            {service.favorite && (
              <>
                <Action
                  title="Move Up in Favorites"
                  onAction={() => moveFavoriteUp(service)}
                  icon={Icon.ArrowUp}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                />
                <Action
                  title="Move Down in Favorites"
                  onAction={() => moveFavoriteDown(service)}
                  icon={Icon.ArrowDown}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                />
              </>
            )}
          </ActionPanel>
        }
      />
    );
  }
}
