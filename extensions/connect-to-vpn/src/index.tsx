import { Action, ActionPanel, Icon, List, Toast, showToast, getPreferenceValues, LocalStorage } from "@raycast/api";
import { exec } from "child_process";
import { useEffect, useState, useMemo } from "react";

type Preferences = {
  hideInvalidDevices: boolean;
  sortBy: "ascService" | "descService" | "ascType" | "descType";
};

type NetworkService = {
  id: string;
  name: string;
  hardwarePort: string;
  device: string;
  status: NetworkServiceStatus;
  favorite: boolean;
  order: number;
};

type NetworkServiceStatus = "connected" | "connecting" | "disconnecting" | "disconnected" | "invalid";

const normalizePort = (hardwarePort: string, name: string): string => {
  if (hardwarePort === name) return "";
  return hardwarePort === "com.wireguard.macos" ? "WireGuard" : hardwarePort;
};

const activeStatusOrder = ["connected", "connecting", "disconnecting"];

const sortNetworkServices = (
  services: NetworkService[],
  sortBy: "ascService" | "descService" | "ascType" | "descType"
): NetworkService[] => {
  return services.sort((a, b) => {
    // Sort active statuses first
    if (activeStatusOrder.includes(a.status) && !activeStatusOrder.includes(b.status)) return -1;
    if (!activeStatusOrder.includes(a.status) && activeStatusOrder.includes(b.status)) return 1;

    // Then sort by favorites and order
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    if (a.favorite && b.favorite) return a.order - b.order;

    // Invalid services go to the bottom
    if (a.status === "invalid") return 1;
    if (b.status === "invalid") return -1;

    const order = sortBy.startsWith("asc") ? 1 : -1;

    let compA = a.name,
      compB = b.name;
    if (sortBy.includes("Type")) {
      compA = normalizePort(a.hardwarePort, a.name);
      compB = normalizePort(b.hardwarePort, b.name);
    }

    const primaryComparison = compA.localeCompare(compB) * order;

    // Secondary sorting by name if the primary comparison is equal
    if (primaryComparison === 0) {
      return a.name.localeCompare(b.name) * order;
    }

    return primaryComparison;
  });
};

const parseServices = (text: string): NetworkService[] => {
  const regex = /\((\d+)\)\s+(.*?)\s+\(Hardware Port: (.*?), Device: (.*?)\)/g;
  return Array.from(text.matchAll(regex)).map((item) => ({
    id: item[1],
    name: item[2],
    hardwarePort: item[3],
    device: item[4],
    status: "disconnected",
    favorite: false, // Default to not favorite
    order: 0, // Default order
  }));
};

const execPromise = (command: string): Promise<string> =>
  new Promise((resolve, reject) => {
    exec(command, (err, stdout) => {
      if (err) {
        reject(err);
      } else {
        resolve(stdout.trim());
      }
    });
  });

const listNetworkServiceOrder = (): Promise<string> => execPromise("/usr/sbin/networksetup -listnetworkserviceorder");

const showPPPoEStatus = (networkServiceName: string): Promise<NetworkServiceStatus> => {
  networkServiceName = networkServiceName.replace(/"/g, '\\"');
  return execPromise(
    `/usr/sbin/networksetup -showpppoestatus "${networkServiceName}"`
  ) as Promise<NetworkServiceStatus>;
};

// Local storage keys
const FAVORITES_KEY = "network-service-favorites";
const FAVORITES_ORDER_KEY = "network-service-favorites-order";

const loadFavorites = async (): Promise<Record<string, boolean>> => {
  const favorites = await LocalStorage.getItem<string>(FAVORITES_KEY);
  return favorites ? JSON.parse(favorites) : {};
};

const saveFavorites = async (favorites: Record<string, boolean>) => {
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
};

const loadFavoriteOrder = async (): Promise<Record<string, number>> => {
  const order = await LocalStorage.getItem<string>(FAVORITES_ORDER_KEY);
  return order ? JSON.parse(order) : {};
};

const saveFavoriteOrder = async (order: Record<string, number>) => {
  await LocalStorage.setItem(FAVORITES_ORDER_KEY, JSON.stringify(order));
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [networkServices, setNetworkServices] = useState<Record<string, NetworkService>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [favoriteOrder, setFavoriteOrder] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadData = async () => {
      const favs = await loadFavorites();
      const order = await loadFavoriteOrder();
      setFavorites(favs);
      setFavoriteOrder(order);
      await fetchDataWithFavorites(favs, order);
    };

    loadData();
  }, []);

  const updateServiceStatus = (service: NetworkService, status: NetworkServiceStatus) => {
    const networkServiceName = service.name.replace(/"/g, '\\"');
    const command =
      status === "connecting"
        ? `/usr/sbin/networksetup -connectpppoeservice "${networkServiceName}"`
        : `/usr/sbin/networksetup -disconnectpppoeservice "${networkServiceName}"`;

    execPromise(command)
      .then(() => {
        setNetworkServices((currentServices) => ({
          ...currentServices,
          [service.id]: { ...service, status },
        }));
      })
      .catch((err) => setError(err));
  };

  const fetchServiceStatus = async (service: NetworkService) => {
    try {
      const status = await showPPPoEStatus(service.name);
      setNetworkServices((currentServices) => ({
        ...currentServices,
        [service.id]: { ...service, status },
      }));
    } catch (err) {
      setError(err as Error);
    }
  };

  const addToFavorites = async (service: NetworkService) => {
    const updatedFavorites = { ...favorites, [service.id]: true };
    setFavorites(updatedFavorites);
    saveFavorites(updatedFavorites);
    const updatedOrder = { ...favoriteOrder, [service.id]: Object.keys(favoriteOrder).length };
    setFavoriteOrder(updatedOrder);
    saveFavoriteOrder(updatedOrder);
    setNetworkServices((currentServices) => ({
      ...currentServices,
      [service.id]: { ...service, favorite: true, order: updatedOrder[service.id] },
    }));
  };

  const removeFromFavorites = async (service: NetworkService) => {
    const updatedFavorites = { ...favorites };
    delete updatedFavorites[service.id];
    setFavorites(updatedFavorites);
    saveFavorites(updatedFavorites);

    const updatedOrder = { ...favoriteOrder };
    delete updatedOrder[service.id];
    setFavoriteOrder(updatedOrder);
    saveFavoriteOrder(updatedOrder);
    setNetworkServices((currentServices) => ({
      ...currentServices,
      [service.id]: { ...service, favorite: false, order: 0 },
    }));
  };

  const moveFavoriteUp = (service: NetworkService) => {
    const keys = Object.keys(favoriteOrder).sort((a, b) => favoriteOrder[a] - favoriteOrder[b]);
    const index = keys.indexOf(service.id);
    if (index > 0) {
      const previousKey = keys[index - 1];
      const newOrder = { ...favoriteOrder };

      // Swap orders with the previous favorite
      const temp = newOrder[previousKey];
      newOrder[previousKey] = newOrder[service.id];
      newOrder[service.id] = temp;

      setFavoriteOrder(newOrder);
      saveFavoriteOrder(newOrder);

      setNetworkServices((currentServices) => ({
        ...currentServices,
        [service.id]: { ...service, order: newOrder[service.id] },
        [previousKey]: { ...currentServices[previousKey], order: newOrder[previousKey] },
      }));
    }
  };

  const moveFavoriteDown = (service: NetworkService) => {
    const keys = Object.keys(favoriteOrder).sort((a, b) => favoriteOrder[a] - favoriteOrder[b]);
    const index = keys.indexOf(service.id);
    if (index < keys.length - 1) {
      const nextKey = keys[index + 1];
      const newOrder = { ...favoriteOrder };

      // Swap orders with the next favorite
      const temp = newOrder[nextKey];
      newOrder[nextKey] = newOrder[service.id];
      newOrder[service.id] = temp;

      setFavoriteOrder(newOrder);
      saveFavoriteOrder(newOrder);

      setNetworkServices((currentServices) => ({
        ...currentServices,
        [service.id]: { ...service, order: newOrder[service.id] },
        [nextKey]: { ...currentServices[nextKey], order: newOrder[nextKey] },
      }));
    }
  };

  const connectToPPPoEService = (service: NetworkService) => updateServiceStatus(service, "connecting");
  const disconnectFromPPPoEService = (service: NetworkService) => updateServiceStatus(service, "disconnecting");

  const fetchDataWithFavorites = async (favs: Record<string, boolean>, order: Record<string, number>) => {
    try {
      const output = await listNetworkServiceOrder();
      const denylist = ["Wi-Fi", "Bluetooth PAN", "Thunderbolt Bridge"];
      const lines = output.split("\n");
      const serviceLines = lines.slice(1).join("\n");

      const services = parseServices(serviceLines).filter((service) => !denylist.includes(service.name));
      const serviceStatuses = await Promise.all(
        services.map((service) =>
          showPPPoEStatus(service.name).then((status) => ({
            ...service,
            status,
            favorite: !!favs[service.id],
            order: order[service.id] ?? 0,
          }))
        )
      );
      const servicesMap = serviceStatuses.reduce(
        (acc, service) => ({ ...acc, [service.id]: service }),
        {} as Record<string, NetworkService>
      );

      setNetworkServices(servicesMap);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const needsUpdate = Object.values(networkServices).some(
      (service) => service.status === "connecting" || service.status === "disconnecting"
    );
    if (!isLoading && needsUpdate) {
      const intervalId = setInterval(() => fetchDataWithFavorites(favorites, favoriteOrder), 500);
      return () => clearInterval(intervalId);
    }
  }, [isLoading, networkServices, favorites, favoriteOrder]);

  if (error) {
    showToast(Toast.Style.Failure, "Something went wrong", error.message);
  }

  // Split services into categories
  const favoriteServices = useMemo(
    () => Object.values(networkServices).filter((service) => service.favorite),
    [networkServices]
  );
  const otherServices = useMemo(
    () => Object.values(networkServices).filter((service) => !service.favorite && service.status !== "invalid"),
    [networkServices]
  );
  const invalidServices = useMemo(
    () => Object.values(networkServices).filter((service) => service.status === "invalid"),
    [networkServices]
  );

  return (
    <List isLoading={isLoading}>
      {favoriteServices.length > 0 && (
        <List.Section title="Favorites">
          {sortNetworkServices(favoriteServices, preferences.sortBy).map((service) => (
            <NetworkServiceItem key={service.id} service={service} />
          ))}
        </List.Section>
      )}

      {otherServices.length > 0 && (
        <List.Section title="VPN Services">
          {sortNetworkServices(otherServices, preferences.sortBy).map((service) => (
            <NetworkServiceItem key={service.id} service={service} />
          ))}
        </List.Section>
      )}

      {!preferences.hideInvalidDevices && invalidServices.length > 0 && (
        <List.Section title="Other Services">
          {sortNetworkServices(invalidServices, preferences.sortBy).map((service) => (
            <NetworkServiceItem key={service.id} service={service} />
          ))}
        </List.Section>
      )}
    </List>
  );

  function NetworkServiceItem({ service }: NetworkServiceItemProps) {
    const actionDetails = {
      disconnected: { actionName: "Connect", action: () => connectToPPPoEService(service), icon: Icon.Circle },
      connected: { actionName: "Disconnect", action: () => disconnectFromPPPoEService(service), icon: Icon.Checkmark },
      connecting: { actionName: undefined, action: undefined, icon: Icon.CircleEllipsis },
      disconnecting: { actionName: undefined, action: undefined, icon: Icon.CircleEllipsis },
      invalid: { actionName: undefined, action: undefined, icon: Icon.XMarkCircle },
    }[service.status] || { icon: Icon.XMarkCircle };

    const subtitle = service.hardwarePort === "com.wireguard.macos" ? "WireGuard" : service.hardwarePort;

    const openNetworkSettings = () => {
      exec("open x-apple.systempreferences:com.apple.Network-Settings.extension", (err) => {
        if (err) {
          showToast({
            title: "Error",
            message: "Could not open Network Settings",
            style: Toast.Style.Failure,
          });
        }
      });
    };

    return (
      <List.Item
        icon={actionDetails.icon}
        title={service.name}
        subtitle={service.name !== subtitle ? subtitle : undefined}
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

type NetworkServiceItemProps = {
  service: NetworkService;
};
