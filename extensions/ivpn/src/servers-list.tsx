import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import Fuse from "fuse.js";
import { useEffect, useMemo, useRef, useState } from "react";

import { IVPN } from "@/api/ivpn";
import { IvpnPingAlreadyInProgressError, IvpnServersPingingSkippedError } from "@/api/ivpn/errors";
import { IvpnServerParsed } from "@/api/ivpn/types";
import { IvpnConnectionProvider, useIvpnConnection } from "@/contexts/IvpnConnectionContext";
import { useFrecencySortingExtended } from "@/hooks/useFrecencySortingExtended";
import { getRandomValue } from "@/utils/arrays";
import { handleError } from "@/utils/errorHandler";
import { ConnectionInfo } from "@/views/connection-info";

import { getFlagIcon } from "./utils/flags";

export default () => (
  <IvpnConnectionProvider>
    <ServerList />
  </IvpnConnectionProvider>
);

function ServerList() {
  const abortable = useRef(new AbortController());

  const [shouldPing, setShouldPing] = useState(true);
  const [citiesUnfiltered, setCitiesCached] = useCachedState<IvpnCity[] | undefined>("servers-list");
  const {
    isLoading: isLoadingCities,
    error: citiesError,
    revalidate: refetchCities,
  } = usePromise(
    async (shouldPing) =>
      collapseServersIntoCities(await IVPN.getServers({ signal: abortable.current.signal, shouldPing })),
    [shouldPing],
    {
      abortable,
      onData: setCitiesCached,
      onError: (error) => {
        if (error instanceof IvpnServersPingingSkippedError) {
          // this weird error will occur unpredictably
          // if we're already connected trying to ping
          if (!citiesUnfiltered?.length) setShouldPing(false); // i.e. try again w/o pinging, but only if we have no cached pinged servers
          return;
        }
        if (!(error instanceof IvpnPingAlreadyInProgressError)) setCitiesCached(undefined);
      },
    },
  );

  const hasAnyPings = useMemo(() => !!citiesUnfiltered?.some((city) => !!city.server.pingMs), [citiesUnfiltered]);

  const [searchQuery, setSearchQuery] = useState("");

  const [sortBy, setSortBy] = useCachedState<ServersSortType>("servers-sort-by", "frecency");
  const compareMap: Record<ServersSortType, (a: IvpnCity, b: IvpnCity) => number> = {
    speed: (a, b) => {
      const speedA = a.server?.pingMs ?? Infinity;
      const speedB = b.server?.pingMs ?? Infinity;
      return speedA - speedB;
    },
    country: (a, b) => a.country.localeCompare(b.country) || a.city.localeCompare(b.city),
    city: (a, b) => a.city.localeCompare(b.city),
    frecency: compareFrecency,
  };

  const {
    data,
    visitItem,
    resetRanking,
    compare: _compareFrecency,
    resetRankingSignal,
  } = useFrecencySortingExtended<IvpnCity>(citiesUnfiltered, {
    key: getCityKey,
    sortUnvisited: compareMap["speed"],
  });
  function compareFrecency(a: IvpnCity, b: IvpnCity) {
    return _compareFrecency(a, b);
  }

  const citiesSortedUnfiltered = useMemo(() => {
    if (!citiesUnfiltered || !sortBy) return;
    const compare = compareMap[sortBy];
    const sorted = citiesUnfiltered.toSorted(compare);
    return sorted;
  }, [citiesUnfiltered, sortBy, resetRankingSignal, data]);

  const fuse = useMemo(() => {
    if (!citiesSortedUnfiltered) return;
    return new Fuse(citiesSortedUnfiltered, {
      keys: [
        { name: "city", weight: 0.6 },
        { name: "country", weight: 0.3 },
        { name: "countryCode", weight: 0.1 },
      ],
      threshold: 0.3,
    });
  }, [citiesSortedUnfiltered]);

  const cities = useMemo(() => {
    if (searchQuery) {
      return fuse?.search(searchQuery).map(({ item }) => item);
    } else {
      return citiesSortedUnfiltered;
    }
  }, [fuse, searchQuery, citiesSortedUnfiltered]);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(cities ? getCityKey(cities[0]) : null);
  const [pendingConnectItem, setPendingConnectItem] = useState<IvpnCity | null>(null);
  const onRequestConnectToItem = (city: IvpnCity) => {
    setSelectedItemId(getCityKey(city));
    setPendingConnectItem(city);
  };

  const { showErrorToast, ErrorComponent } = handleError(citiesError, refetchCities);
  if (!(citiesError instanceof IvpnServersPingingSkippedError)) {
    if (ErrorComponent && (!cities || !(citiesError instanceof IvpnPingAlreadyInProgressError))) {
      return <ErrorComponent />;
    }
    showErrorToast?.();
  }

  return (
    <List
      selectedItemId={selectedItemId ?? undefined}
      onSelectionChange={setSelectedItemId}
      isLoading={isLoadingCities}
      searchText={searchQuery}
      onSearchTextChange={setSearchQuery}
      searchBarAccessory={
        <List.Dropdown tooltip="Sorting Setting" value={sortBy} onChange={(v) => setSortBy(v as typeof sortBy)}>
          <List.Dropdown.Item title="Frequently Used" value="frecency" />
          <List.Dropdown.Item title="Fastest" value="speed" />
          <List.Dropdown.Item title="Countries A-Z" value="country" />
          <List.Dropdown.Item title="Cities A-Z" value="city" />
        </List.Dropdown>
      }
    >
      {cities ? (
        <ServerListItems
          items={cities}
          sortedBy={sortBy}
          frecency={{ visitItem, resetRanking }}
          pendingConnect={{ pendingConnectItem, onRequestConnectToItem }}
          formatting={{ showPingTags: hasAnyPings }}
        />
      ) : null}
    </List>
  );
}

type ServerListItemsProps = {
  items: IvpnCity[];
  sortedBy: ServersSortType;
  frecency: { visitItem: (item: IvpnCity) => Promise<void>; resetRanking: (item: IvpnCity) => Promise<void> };
  pendingConnect: { pendingConnectItem: IvpnCity | null; onRequestConnectToItem: (city: IvpnCity) => void };
  formatting: { showPingTags: boolean };
};
function ServerListItems({
  items,
  sortedBy,
  frecency: { visitItem, resetRanking },
  pendingConnect: { pendingConnectItem, onRequestConnectToItem },
  formatting,
}: ServerListItemsProps) {
  const ivpn = useIvpnConnection();
  const nav = useNavigation();

  const [connectionStates, setConnectionStates] = useState<{
    connectedTo: Pick<IvpnCity, "city" | "countryCode"> | null;
    connectingTo: Pick<IvpnCity, "city" | "countryCode"> | null;
    disconnectingFrom: Pick<IvpnCity, "city" | "countryCode"> | null;
  }>({ connectedTo: null, connectingTo: null, disconnectingFrom: null });

  useEffect(() => {
    if (ivpn.info?.vpnStatus !== "CONNECTED") return;
    const connectedTo = { city: ivpn.info.serverLocation.city, countryCode: ivpn.info.serverLocation.countryCode };
    setConnectionStates((prev) => ({ ...prev, connectedTo }));
  }, [ivpn.info, items]);

  const matches = (item: IvpnCity, connectionState: Pick<IvpnCity, "city" | "countryCode"> | null) => {
    if (!connectionState) return false;
    const { city, countryCode } = connectionState;
    return item.city === city && item.countryCode == countryCode;
  };

  const handleConnecting = (city: IvpnCity) => {
    showToast({
      title: "Connecting...",
      style: Toast.Style.Animated,
    });
    setConnectionStates((prev) => ({ disconnectingFrom: prev.connectedTo, connectedTo: null, connectingTo: city }));
  };
  const handleConnected = (city: IvpnCity) => {
    showToast({ title: "Connected" });
    setConnectionStates({ connectedTo: city, disconnectingFrom: null, connectingTo: null });
  };
  const handleDisconnecting = (city: IvpnCity) => {
    showToast({
      title: "Disconnecting...",
      style: Toast.Style.Animated,
    });
    setConnectionStates((prev) => ({ ...prev, connectedTo: null, disconnectingFrom: city }));
  };
  const handleDisconnected = () => {
    showToast({ title: "Disconnected", style: Toast.Style.Failure });
    setConnectionStates({ connectedTo: null, disconnectingFrom: null, connectingTo: null });
  };

  const connect = async (info: IvpnCity) => {
    switch (getPrefs().connectDisconnectBehavior) {
      case "stayInList": {
        handleConnecting(info);
        await ivpn.connect({ strategy: "SERVER", host: info.server.location });
        handleConnected(info);
        visitItem(info);
        break;
      }
      case "showInteractiveView": {
        nav.push(
          <IvpnConnectionProvider>
            <ConnectionInfo
              initialTrigger={async ({ connect }) => {
                await connect({ strategy: "SERVER", host: info.server.location });
                visitItem(info);
              }}
            />
          </IvpnConnectionProvider>,
          () => ivpn.revalidateInfo(),
        );
        break;
      }
      default: {
        throw new Error("Shouldn't happen.");
      }
    }
  };

  const disconnect = async (info: IvpnCity) => {
    switch (getPrefs().connectDisconnectBehavior) {
      case "stayInList": {
        handleDisconnecting(info);
        await ivpn.disconnect();
        handleDisconnected();
        break;
      }
      case "showInteractiveView": {
        nav.push(
          <IvpnConnectionProvider>
            <ConnectionInfo initialTrigger={async ({ disconnect }) => disconnect()} />
          </IvpnConnectionProvider>,
          () => ivpn.revalidateInfo(),
        );
        break;
      }
      default: {
        throw new Error("Shouldn't happen.");
      }
    }
  };

  const connectRandom = async () => {
    const randomCity = getRandomValue(items)!;
    onRequestConnectToItem(randomCity);
  };

  const connectFastest = async () => {
    const fastestCity =
      sortedBy === "speed"
        ? items[0]
        : items.reduce(
            (fastest, current) =>
              (current.server.pingMs ?? Infinity) < (fastest.server.pingMs ?? Infinity) ? current : fastest,
            items[0],
          );
    onRequestConnectToItem(fastestCity);
  };

  useEffect(() => {
    // trigger `connect` here (not directly in connectRandom/connectFastest)
    // to ensure that parent selection state updates reach this component first,
    // preventing bad UI flicker
    if (pendingConnectItem) connect(pendingConnectItem);
  }, [pendingConnectItem]);

  return (
    <>
      {items.map((item) => {
        const key = getCityKey(item);
        return (
          <ServerListItem
            id={key}
            key={key}
            info={item}
            connectionState={{
              isConnected: matches(item, connectionStates.connectedTo),
              isConnecting: matches(item, connectionStates.connectingTo),
              isDisconnecting: matches(item, connectionStates.disconnectingFrom),
            }}
            events={{
              onConnect: connect,
              onDisconnect: disconnect,
              onResetRanking: resetRanking,
              onConnectRandom: connectRandom,
              onConnectFastest: connectFastest,
            }}
            formatting={formatting}
          />
        );
      })}
    </>
  );
}

function ServerListItem({
  id,
  info,
  connectionState,
  events,
  formatting: { showPingTags },
}: {
  id: string;
  info: IvpnCity;
  connectionState: { isConnected: boolean; isConnecting: boolean; isDisconnecting: boolean };
  events: {
    onConnect: (info: IvpnCity) => void;
    onDisconnect: (info: IvpnCity) => void;
    onResetRanking: ServerListItemsProps["frecency"]["resetRanking"];
    onConnectRandom: () => void;
    onConnectFastest: () => void;
  };
  formatting: ServerListItemsProps["formatting"];
}) {
  const accessories = getServerListItemAccessories(info, connectionState, showPingTags);

  return (
    <List.Item
      id={id}
      title={info.city}
      subtitle={info.country}
      accessories={accessories}
      icon={getFlagIcon(info.countryCode)}
      actions={
        <ActionPanel>
          {!connectionState.isConnected ? (
            <Action title="Connect" icon={Icon.Livestream} onAction={() => events.onConnect(info)} />
          ) : (
            <Action
              title="Disconnect"
              icon={Icon.LivestreamDisabled}
              onAction={() => events.onDisconnect(info)}
              style={Action.Style.Destructive}
            />
          )}
          <Action
            title="Reset Ranking"
            icon={Icon.ArrowCounterClockwise}
            shortcut={{ key: "r", modifiers: ["cmd", "shift"] }}
            onAction={() => events.onResetRanking(info)}
          />
          <ActionPanel.Section>
            <Action
              title="Connect to Fastest"
              icon={Icon.Gauge}
              shortcut={{ key: "enter", modifiers: ["opt", "cmd"] }}
              onAction={events.onConnectFastest}
            />
            <Action
              title="Connect to Random"
              icon={Icon.Shuffle}
              shortcut={{ key: "enter", modifiers: ["opt", "cmd", "shift"] }}
              onAction={events.onConnectRandom}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function getServerListItemAccessories(
  info: IvpnCity,
  connectionState: Parameters<typeof ServerListItem>[0]["connectionState"],
  showPingTags: boolean,
) {
  const accessories: List.Item.Accessory[] = [];
  // connection status
  if (connectionState.isDisconnecting) {
    accessories.push({ icon: { source: Icon.LivestreamDisabled } });
  } else if (connectionState.isConnecting) {
    accessories.push({ icon: { source: Icon.Livestream } });
  } else if (connectionState.isConnected) {
    accessories.push({ icon: { source: Icon.Livestream, tintColor: Color.Green } });
  }
  // ping speed
  if (info.server.pingMs === null) {
    if (showPingTags) accessories.push({ tag: { value: "unknown", color: Color.SecondaryText } });
  } else if (info.server.pingMs < 100) {
    accessories.push({ tag: { value: info.server.pingMs + "ms", color: Color.Green } });
  } else if (info.server.pingMs < 300) {
    accessories.push({ tag: { value: info.server.pingMs + "ms", color: Color.Yellow } });
  } else {
    accessories.push({ tag: { value: info.server.pingMs + "ms", color: Color.Red } });
  }

  return accessories;
}

function collapseServersIntoCities(servers: IvpnServerParsed[]) {
  const map = new Map<string, IvpnCity>();

  for (const server of servers) {
    const cityKey = getCityKey(server);
    const city = {
      city: server.city,
      country: server.country,
      countryCode: server.countryCode,
      server: {
        location: server.location,
        protocol: server.protocol,
        ISP: server.ISP,
        ipvTunnels: server.ipvTunnels,
        pingMs: server.pingMs,
      },
    };
    const { preferredProtocol } = getPrefs();
    if (preferredProtocol === "any") {
      // set if no server is set, override if iterated server is faster
      if (!map.has(cityKey)) {
        map.set(cityKey, city);
      } else if ((map.get(cityKey)!.server.pingMs ?? Infinity) > (city.server.pingMs ?? Infinity)) {
        map.set(cityKey, city);
      }
    } else if (preferredProtocol === city.server.protocol) {
      // only set server if it matches user's preferred protocol
      map.set(cityKey, city);
    }
  }

  return Array.from(map.values());
}

type IvpnCity = Pick<IvpnServerParsed, "city" | "country" | "countryCode"> & {
  server: Pick<IvpnServerParsed, "location" | "protocol" | "ISP" | "ipvTunnels" | "pingMs">;
};
type ServersSortType = "frecency" | "speed" | "country" | "city";

const getCityKey = (city: Pick<IvpnCity, "city" | "countryCode">) => String([city.city, city.countryCode]);

const getPrefs = () => getPreferenceValues<Preferences.ServersList>();
