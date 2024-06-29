import { useState, useEffect, useMemo } from "react";
import { exec } from "child_process";
import { Icon, LocalStorage, Toast, getPreferenceValues, showToast } from "@raycast/api";

type Preferences = {
  hideInvalidDevices: boolean;
  sortBy: "ascService" | "descService" | "ascType" | "descType";
};

export type NetworkService = {
  id: string;
  name: string;
  hardwarePort: string;
  device: string;
  status: NetworkServiceStatus;
  favorite: boolean;
  order: number;
};

type NetworkServiceStatus = "connected" | "connecting" | "disconnecting" | "disconnected" | "invalid";

export function useNetworkServices() {
  const { sortBy, hideInvalidDevices } = getPreferenceValues<Preferences>();
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
          })),
        ),
      );
      const servicesMap = serviceStatuses.reduce(
        (acc, service) => ({ ...acc, [service.id]: service }),
        {} as Record<string, NetworkService>,
      );

      setNetworkServices(servicesMap);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionForService = (service: NetworkService) =>
    ({
      disconnected: { actionName: "Connect", action: () => connectToPPPoEService(service), icon: Icon.Circle },
      connected: { actionName: "Disconnect", action: () => disconnectFromPPPoEService(service), icon: Icon.Checkmark },
      connecting: { actionName: undefined, action: undefined, icon: Icon.CircleEllipsis },
      disconnecting: { actionName: undefined, action: undefined, icon: Icon.CircleEllipsis },
      invalid: { actionName: undefined, action: undefined, icon: Icon.XMarkCircle },
    })[service.status] || { icon: Icon.XMarkCircle };

  useEffect(() => {
    const needsUpdate = Object.values(networkServices).some(
      (service) => service.status === "connecting" || service.status === "disconnecting",
    );
    if (!isLoading && needsUpdate) {
      const intervalId = setInterval(() => fetchDataWithFavorites(favorites, favoriteOrder), 500);
      return () => clearInterval(intervalId);
    }
  }, [isLoading, networkServices, favorites, favoriteOrder]);

  const favoriteServices = useMemo(
    () =>
      sortNetworkServices(
        Object.values(networkServices).filter((service) => service.favorite),
        sortBy,
      ),
    [networkServices, sortBy],
  );
  const otherServices = useMemo(
    () =>
      sortNetworkServices(
        Object.values(networkServices).filter((service) => !service.favorite && service.status !== "invalid"),
        sortBy,
      ),
    [networkServices, sortBy],
  );
  const invalidServices = useMemo(
    () =>
      sortNetworkServices(
        Object.values(networkServices).filter((service) => service.status === "invalid"),
        sortBy,
      ),
    [networkServices, sortBy],
  );

  return {
    isLoading,
    error,
    favoriteServices,
    otherServices,
    invalidServices,
    fetchServiceStatus,
    addToFavorites,
    removeFromFavorites,
    moveFavoriteUp,
    moveFavoriteDown,
    getActionForService,
    hideInvalidDevices,
  };
}

export function normalizeHardwarePort(hardwarePort: string, name: string) {
  return (
    {
      "com.wireguard.macos": "WireGuard",
      [name]: "",
    }[hardwarePort] || hardwarePort
  );
}

export function openNetworkSettings() {
  exec("open x-apple.systempreferences:com.apple.Network-Settings.extension", (err) => {
    if (err) {
      showToast({
        title: "Error",
        message: "Could not open Network Settings",
        style: Toast.Style.Failure,
      });
    }
  });
}

const sortNetworkServices = (
  services: NetworkService[],
  sortBy: "ascService" | "descService" | "ascType" | "descType",
): NetworkService[] =>
  services.sort((a, b) => {
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
      compA = normalizeHardwarePort(a.hardwarePort, a.name);
      compB = normalizeHardwarePort(b.hardwarePort, b.name);
    }

    const primaryComparison = compA.localeCompare(compB) * order;

    // Secondary sorting by name if the primary comparison is equal
    if (primaryComparison === 0) {
      return a.name.localeCompare(b.name) * order;
    }

    return primaryComparison;
  });

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

const showPPPoEStatus = (networkServiceName: string): Promise<NetworkServiceStatus> => {
  networkServiceName = networkServiceName.replace(/"/g, '\\"');
  return execPromise(
    `/usr/sbin/networksetup -showpppoestatus "${networkServiceName}"`,
  ) as Promise<NetworkServiceStatus>;
};

const activeStatusOrder = ["connected", "connecting", "disconnecting"];
