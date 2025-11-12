import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  PopToRootType,
  closeMainWindow,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { usePromise } from "@raycast/utils";
import {
  isPrismLauncherInstalled,
  loadInstances,
  loadFavoriteInstanceIds,
  loadFavoriteServers,
  saveFavoriteServers,
  parseServersFromInstance,
  sortServers,
} from "../utils/prism";
import { Instance, Server } from "../types";
import { joinServer } from "../utils/instance";

export default function FavoriteServers() {
  const [isPrismInstalled, setIsPrismInstalled] = useState<boolean>();
  const [servers, setServers] = useState<Server[]>();
  const [favoriteAddresses, setFavoriteAddresses] = useState<string[]>([]);

  const toggleFavorite = async (address: string) => {
    const newFavorites = favoriteAddresses.includes(address)
      ? favoriteAddresses.filter((a) => a !== address)
      : [...favoriteAddresses, address];

    setFavoriteAddresses(newFavorites);
    await saveFavoriteServers(LocalStorage, newFavorites);

    if (servers) {
      const updatedServers = servers
        .map((server) => ({
          ...server,
          favorite: newFavorites.includes(server.address),
        }))
        .filter((server) => server.favorite);
      setServers(sortServers(updatedServers, newFavorites));
    }
  };

  // Load favorite server addresses
  const { data: storedFavorites } = usePromise(() => loadFavoriteServers(LocalStorage), []);
  useEffect(() => {
    if (storedFavorites) {
      setFavoriteAddresses(storedFavorites);
    }
  }, [storedFavorites]);

  // Check Prism presence
  const { data: installed } = usePromise(isPrismLauncherInstalled, []);
  useEffect(() => {
    if (installed !== undefined) {
      setIsPrismInstalled(installed);
    }
  }, [installed]);

  // Load servers from all instances once we know favorites and installation status
  const { data: loadedServers, isLoading: isLoadingServers } = usePromise(
    async () => {
      const favoriteInstanceIds = await loadFavoriteInstanceIds(LocalStorage);
      const instances: Instance[] = await loadInstances(favoriteInstanceIds);

      const allServers: Server[] = [];
      for (const instance of instances) {
        const parsed = await parseServersFromInstance(instance);
        allServers.push(
          ...parsed.map((s) => ({
            ...s,
            favorite: storedFavorites!.includes(s.address),
          })),
        );
      }

      const favoriteServersOnly = allServers.filter((s) => storedFavorites!.includes(s.address));

      // Deduplicate servers by IP address - keep only the first occurrence
      const uniqueServers = favoriteServersOnly.filter(
        (server, index, self) => index === self.findIndex((s) => s.address === server.address),
      );

      return sortServers(uniqueServers, storedFavorites!);
    },
    [],
    { execute: Boolean(installed && storedFavorites) },
  );

  useEffect(() => {
    if (loadedServers) {
      setServers(loadedServers);
    }
  }, [loadedServers]);

  return (
    <List
      searchBarPlaceholder={"Search favorite servers..."}
      {...(isPrismInstalled ? { isLoading: servers === undefined || isLoadingServers } : {})}
    >
      {servers && servers.length > 0 ? (
        servers.map((server, index) => (
          <List.Item
            key={`fav-server-${index}`}
            title={server.name}
            subtitle={server.address}
            accessories={[{ text: server.instanceName }, ...(server.favorite ? [{ icon: Icon.Star }] : [])]}
            icon={server.icon ? { source: server.icon } : Icon.Network}
            actions={
              <ActionPanel>
                <Action
                  title="Join Server"
                  icon={Icon.GameController}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
                  onAction={async () => {
                    await joinServer(server.instanceId, server.address);
                    await closeMainWindow({
                      popToRootType: PopToRootType.Immediate,
                      clearRootSearch: true,
                    });
                  }}
                />
                <Action
                  title={server.favorite ? "Remove from Favorites" : "Add to Favorites"}
                  icon={server.favorite ? Icon.StarDisabled : Icon.Star}
                  onAction={() => toggleFavorite(server.address)}
                  shortcut={Keyboard.Shortcut.Common.Pin}
                />
                <Action
                  title="Copy Server Address"
                  icon={Icon.CopyClipboard}
                  onAction={async () => {
                    await Clipboard.copy(server.address);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          icon={Icon.Signal0}
          title={"No favorite servers"}
          description={"Mark servers as favorites to see them here"}
        />
      )}
    </List>
  );
}
