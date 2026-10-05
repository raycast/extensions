import { useState, useEffect, useMemo, useRef } from "react";
import { exec, execFile } from "child_process";
import { Icon, LocalStorage, Toast, getPreferenceValues, showToast, environment, LaunchType } from "@raycast/api";
import { updateVpnStatus } from "./store";

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

const networkServiceStatuses = ["connected", "connecting", "disconnecting", "disconnected", "invalid"] as const;

type NetworkServiceStatus = (typeof networkServiceStatuses)[number];

export const LAST_USED_KEY = "network-service-last-used";

export const setServiceStatus = async (
  service: NetworkService,
  status: NetworkServiceStatus,
  statusUpdateFunction?: (status: NetworkServiceStatus) => void,
) => {
  const action = status === "connecting" ? "-connectpppoeservice" : "-disconnectpppoeservice";

  // Show the transition in this command right away. networksetup takes a moment, and the menu
  // closes on click, so a late update is one the user never sees.
  if (statusUpdateFunction) statusUpdateFunction(status);

  console.log(`Executing command for ${service.name}: ${status}`);
  try {
    await networksetup([action, service.name], CONNECT_TIMEOUT_MS);
  } catch (err) {
    // Put the service back to what it actually is instead of leaving it mid-transition
    const actual = await currentStatus(service);
    if (statusUpdateFunction) statusUpdateFunction(actual);
    await updateVpnStatus({
      serviceId: service.id,
      status: actual,
      timestamp: Date.now(),
    });
    throw err;
  }

  await LocalStorage.setItem(LAST_USED_KEY, service.name);

  // Signal the other commands only now that networksetup has run. Signalling first would launch
  // the menu bar against the status from before the request, and it would take that as its
  // baseline and never hear about the change.
  await updateVpnStatus({
    serviceId: service.id,
    status,
    timestamp: Date.now(),
  });

  // Nothing waits for the service to settle here. Raycast ends a session once the action callback
  // returns, so a callback that polls for seconds outlives the session it belongs to. The service
  // is left showing its transition, and useNetworkServices watches it from an effect instead.
};

export const getNetworkServices = async (favs: Record<string, boolean>, order: Record<string, number>) => {
  const [output, vpnStatuses] = await Promise.all([listNetworkServiceOrder(), listVpnStatuses()]);
  const denylist = ["Wi-Fi", "Bluetooth PAN", "Thunderbolt Bridge"];
  const lines = output.split("\n");
  const serviceLines = lines.slice(1).join("\n");

  const services = parseServices(serviceLines).filter((service) => !denylist.includes(service.name));

  const serviceStatuses = await Promise.all(
    services.map(async (service) => ({
      ...service,
      status: await currentStatus(service, vpnStatuses),
      favorite: !!favs[service.id],
      order: order[service.id] ?? 0,
    })),
  );

  const servicesMap = serviceStatuses.reduce(
    (acc, service) => ({ ...acc, [service.id]: service }),
    {} as Record<string, NetworkService>,
  );

  return servicesMap;
};

// How a service in transition is watched until it settles. Each check is one scutil call of about
// 35 ms, and only runs while something is actually changing.
const SETTLE_POLL_MS = 250;
const SETTLE_MAX_CHECKS = 120;

// macOS needs a moment to report a change it has just been asked to make, so the first checks can
// still answer with the status from before the request. Treat that as "not yet" for about a second
// rather than snapping the service back to where it started.
const SETTLE_GRACE_CHECKS = 4;

const statusBeforeTransition = (status: NetworkServiceStatus) =>
  status === "connecting" ? "disconnected" : status === "disconnecting" ? "connected" : undefined;

export function useNetworkServices() {
  const { sortBy, hideInvalidDevices } = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [networkServices, setNetworkServices] = useState<Record<string, NetworkService>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [favoriteOrder, setFavoriteOrder] = useState<Record<string, number>>({});
  const settleChecks = useRef<Record<string, number>>({});

  useEffect(() => {
    const loadData = async () => {
      const favs = await loadFavorites();
      const order = await loadFavoriteOrder();
      setFavorites(favs);
      setFavoriteOrder(order);
      await fetchDataWithFavorites(favs, order);
    };

    loadData().catch((err) => {
      if (isSessionGone(err)) return;

      console.error("Error loading network services:", err);
      setError(err as Error);
    });
  }, []);

  // A background run has no window to show a toast in
  useEffect(() => {
    if (error && environment.launchType !== LaunchType.Background) {
      showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: error.message }).catch(
        () => undefined,
      );
    }
  }, [error]);

  // A service that is connecting or disconnecting settles on its own a moment later. Watching it
  // from here rather than from the action callback matters: Raycast ends a session once the
  // callback returns, while this effect is part of the component and stops with it.
  useEffect(() => {
    const settling = Object.values(networkServices).filter(
      (service) => service.status === "connecting" || service.status === "disconnecting",
    );

    // Counted per service: one that has been connecting for a while must not use up the grace
    // period, or the check limit, of one that just started
    for (const id of Object.keys(settleChecks.current)) {
      if (!settling.some((service) => service.id === id)) delete settleChecks.current[id];
    }

    const watched = settling.filter((service) => (settleChecks.current[service.id] ?? 0) < SETTLE_MAX_CHECKS);
    if (watched.length === 0) return;

    const checks: Record<string, number> = {};
    for (const service of watched) {
      checks[service.id] = settleChecks.current[service.id] = (settleChecks.current[service.id] ?? 0) + 1;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        // currentStatus rather than the scutil map alone, so a service that map does not cover
        // still settles through the networksetup fallback instead of staying in transition
        const statuses = await listVpnStatuses();
        const resolved = await Promise.all(
          watched.map(async (service) => [service.id, await currentStatus(service, statuses)] as const),
        );
        if (cancelled) return;

        const accepted = resolved.filter(([id, status]) => {
          const service = networkServices[id];
          if (!service) return false;

          return !(checks[id] <= SETTLE_GRACE_CHECKS && status === statusBeforeTransition(service.status));
        });

        setNetworkServices((currentServices) => {
          const updated = { ...currentServices };

          for (const [id, status] of accepted) {
            if (updated[id]) updated[id] = { ...updated[id], status };
          }

          return updated;
        });

        // Tell the other commands once a service has actually settled, so the menu bar does not
        // sit on the transition until its next scheduled refresh
        for (const [id, status] of accepted) {
          if (status === "connected" || status === "disconnected") {
            await updateVpnStatus({ serviceId: id, status, timestamp: Date.now() });
          }
        }
      } catch (err) {
        if (!isSessionGone(err)) console.error("Error while waiting for a service to settle:", err);
      }
    }, SETTLE_POLL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [networkServices]);

  const updateServiceStatus = async (service: NetworkService, status: NetworkServiceStatus) => {
    try {
      await setServiceStatus(service, status, (newStatus) => {
        // Update local state with status
        setNetworkServices((currentServices) => ({
          ...currentServices,
          [service.id]: { ...service, status: newStatus },
        }));
      });
    } catch (err) {
      if (isSessionGone(err)) return;

      console.error(`Error updating service status for ${service.name}:`, err);
      setError(err as Error);
    }
  };

  const fetchServiceStatus = async (service: NetworkService) => {
    try {
      console.log(`Fetching status for ${service.name}`);
      const status = await currentStatus(service);
      console.log(`Status for ${service.name}: ${status}`);

      // Update local state
      setNetworkServices((currentServices) => ({
        ...currentServices,
        [service.id]: { ...service, status },
      }));

      // Update shared state
      await updateVpnStatus({
        serviceId: service.id,
        status,
        timestamp: Date.now(),
      });

      return status;
    } catch (err) {
      if (!isSessionGone(err)) {
        console.error(`Error fetching service status for ${service.name}:`, err);
        setError(err as Error);
      }

      return service.status; // Return current status on error
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
      const servicesMap = await getNetworkServices(favs, order);
      setNetworkServices(servicesMap);
    } catch (err) {
      if (isSessionGone(err)) return;

      console.error("Error fetching data with favorites:", err);
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

// Raycast unloads a session when it is done with the command, and anything still in flight then
// fails with this. The network change itself carries on in macOS; we have simply lost the place to
// report it, so there is nothing to tell the user and nothing to fix.
export const isSessionGone = (err: unknown) => err instanceof Error && err.message === "Worker unloaded";

export function transitionLabel(status: NetworkServiceStatus): string | undefined {
  if (status === "connecting") return "Connecting…";
  if (status === "disconnecting") return "Disconnecting…";

  return undefined;
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
    // Only show toast if not in background mode
    if (err && environment.launchType !== LaunchType.Background) {
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

export const loadFavorites = async (): Promise<Record<string, boolean>> => {
  const favorites = await LocalStorage.getItem<string>(FAVORITES_KEY);
  return favorites ? JSON.parse(favorites) : {};
};

const saveFavorites = async (favorites: Record<string, boolean>) => {
  try {
    await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (err) {
    if (!isSessionGone(err)) console.error("Error saving favorites:", err);
  }
};

export const loadFavoriteOrder = async (): Promise<Record<string, number>> => {
  const order = await LocalStorage.getItem<string>(FAVORITES_ORDER_KEY);
  return order ? JSON.parse(order) : {};
};

const saveFavoriteOrder = async (order: Record<string, number>) => {
  try {
    await LocalStorage.setItem(FAVORITES_ORDER_KEY, JSON.stringify(order));
  } catch (err) {
    if (!isSessionGone(err)) console.error("Error saving favorite order:", err);
  }
};

// networksetup can block indefinitely when a service is in a bad state, and the menu bar command
// refreshes every 30 seconds, so a blocking call stalls the extension host. Raycast gives a command
// five seconds to render, so reads have to give up well inside that; measured at 43-355 ms per call.
// Connecting and disconnecting is not on the render path and is allowed to take longer.
const READ_TIMEOUT_MS = 3_000;
const CONNECT_TIMEOUT_MS = 30_000;

// execFile runs the tool directly rather than through a shell, so service names need no escaping
// and a timed-out call leaves one process behind instead of two.
const run = (file: string, args: string[], timeout: number = READ_TIMEOUT_MS): Promise<string> =>
  new Promise((resolve, reject) => {
    execFile(file, args, { timeout, killSignal: "SIGKILL" }, (err, stdout) => {
      if (err) {
        console.error(`${file} ${args.join(" ")} failed`, err);
        reject(err.killed ? new Error(`${file} ${args[0]} timed out after ${timeout / 1000} seconds`) : err);
      } else {
        resolve(stdout.trim());
      }
    });
  });

const networksetup = (args: string[], timeout?: number): Promise<string> =>
  run("/usr/sbin/networksetup", args, timeout);

const listNetworkServiceOrder = (): Promise<string> => networksetup(["-listnetworkserviceorder"]);

// scutil reports every VPN service and its status in a single call, where networksetup needs one
// call per service. Both read the same SCNetworkConnection state, so the words are the same apart
// from the capital letter.
const listVpnStatuses = async (): Promise<Record<string, NetworkServiceStatus>> => {
  const output = await run("/usr/sbin/scutil", ["--nc", "list"]);

  // * (Disconnected)   <uuid> PPP --> L2TP   "Service name"   [PPP:L2TP]
  const regex = /^.\s*\((\w+)\)\s+\S+\s+.*?"(.+)"\s+\[[^\]]*\]\s*$/gm;
  const statuses: Record<string, NetworkServiceStatus> = {};

  for (const match of output.matchAll(regex)) {
    const status = match[1].toLowerCase();
    if (isNetworkServiceStatus(status)) {
      statuses[match[2]] = status;
    }
  }

  return statuses;
};

// scutil answers for every VPN service at once, so one call covers the whole list and is still
// the cheapest way to check a single service while it connects.
const currentStatus = async (
  service: NetworkService,
  vpnStatuses?: Record<string, NetworkServiceStatus>,
): Promise<NetworkServiceStatus> => {
  const statuses = vpnStatuses ?? (await listVpnStatuses());
  const status = statuses[service.name];
  if (status) return status;

  // A service bound to a device is a physical interface and never has a connection status
  if (service.device !== "") return "invalid";

  // A VPN service scutil did not list under this name, so ask networksetup about this one
  return showPPPoEStatus(service.name);
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

const isNetworkServiceStatus = (value: string): value is NetworkServiceStatus =>
  (networkServiceStatuses as readonly string[]).includes(value);

const showPPPoEStatus = async (networkServiceName: string): Promise<NetworkServiceStatus> => {
  const status = await networksetup(["-showpppoestatus", networkServiceName]);

  // networksetup answers with an empty string and exit code 0 for a service it no longer knows
  return isNetworkServiceStatus(status) ? status : "invalid";
};

const activeStatusOrder = ["connected", "connecting", "disconnecting"];
