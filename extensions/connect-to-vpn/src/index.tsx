import { confirmAlert, Action, ActionPanel, Icon, List, Keyboard, LocalStorage, showToast, Toast } from "@raycast/api";
import {
  NetworkService,
  LAST_USED_KEY,
  normalizeHardwarePort,
  openNetworkSettings,
  transitionLabel,
  useNetworkServices,
} from "./network-services";

export default function Command() {
  const {
    isLoading,
    favoriteServices,
    invalidServices,
    otherServices,
    refreshServicesFromAction,
    error,
    addToFavorites,
    removeFromFavorites,
    moveFavoriteUp,
    moveFavoriteDown,
    hideInvalidDevices,
    getActionForService,
  } = useNetworkServices();

  const hasVisibleServices =
    favoriteServices.length > 0 || otherServices.length > 0 || (!hideInvalidDevices && invalidServices.length > 0);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search network services…"
      navigationTitle={error ? "VPN Status May Be Outdated" : undefined}
    >
      {!hasVisibleServices && (
        <List.EmptyView
          icon={error ? Icon.ExclamationMark : Icon.Network}
          title={error ? "Unable to Load Network Services" : "No Network Services Found"}
          description={
            error ? error.message : "Configure and authenticate your VPN in System Settings, then refresh this list."
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh Services"
                icon={Icon.ArrowClockwise}
                onAction={refreshServicesFromAction}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
              <Action title="Open Network Settings" icon={Icon.Gear} onAction={openNetworkSettings} />
            </ActionPanel>
          }
        />
      )}
      {error && hasVisibleServices && (
        <List.Section title="Refresh Error">
          <List.Item
            icon={Icon.ExclamationMark}
            title="Unable to Refresh Network Services"
            subtitle={error.message}
            actions={
              <ActionPanel>
                <Action
                  title="Retry Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={refreshServicesFromAction}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
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
    const transition = transitionLabel(service.status);

    return (
      <List.Item
        id={service.id}
        keywords={[service.hardwarePort, normalizeHardwarePort(service.hardwarePort, service.name)]}
        icon={actionDetails.icon}
        title={service.name}
        subtitle={normalizeHardwarePort(service.hardwarePort, service.name)}
        accessories={[
          ...(transition ? [{ text: transition }] : []),
          ...(service.favorite ? [{ icon: Icon.Star }] : []),
        ]}
        actions={
          <ActionPanel>
            {actionDetails.actionName && (
              <Action
                title={actionDetails.actionName}
                onAction={actionDetails.action}
                icon={service.status === "connected" ? Icon.Eject : Icon.Plug}
              />
            )}
            <Action
              title="Refresh"
              onAction={refreshServicesFromAction}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              icon={Icon.ArrowClockwise}
            />
            <Action
              title="Open Network Settings"
              onAction={openNetworkSettings}
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            />
            <Action
              title={service.favorite ? "Remove from Favorites" : "Add to Favorites"}
              onAction={() => (service.favorite ? removeFromFavorites(service) : addToFavorites(service))}
              icon={Icon.Star}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
            {service.favorite && (
              <>
                <Action
                  title="Move Favorite Earlier"
                  onAction={() => moveFavoriteUp(service)}
                  icon={Icon.ArrowUp}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                />
                <Action
                  title="Move Favorite Later"
                  onAction={() => moveFavoriteDown(service)}
                  icon={Icon.ArrowDown}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                />
              </>
            )}
            {service.status !== "invalid" && (
              <Action
                title="Use for Toggle Last Used"
                icon={Icon.Switch}
                onAction={async () => {
                  try {
                    if (
                      !(await confirmAlert({
                        title: `Use ${service.name} for Toggle Last Used?`,
                        message: "Your shortcut will connect to or disconnect from this VPN.",
                        primaryAction: { title: "Use VPN" },
                      }))
                    )
                      return;
                    await LocalStorage.setItem(LAST_USED_KEY, service.name);
                    await showToast({ style: Toast.Style.Success, title: `Toggle will use ${service.name}` });
                  } catch (err) {
                    await showToast({ style: Toast.Style.Failure, title: "Unable to Save VPN", message: String(err) });
                  }
                }}
              />
            )}
          </ActionPanel>
        }
      />
    );
  }
}
