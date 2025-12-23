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
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { Unless, When } from "react-if";
import useAsyncEffect from "use-async-effect";
import type { Instance, Server } from "../types";
import { joinServer } from "../utils/instance";
import {
  isPrismLauncherInstalled,
  loadFavoriteInstanceIds,
  loadFavoriteServers,
  loadInstances,
  parseServersFromInstance,
  saveFavoriteServers,
  sortServers,
} from "../utils/prism";
import NoInstall from "./no-install";

export default function FavoriteServers() {
  const { data: isPrismInstalledData, isLoading: isPrismInstalledLoading } = usePromise(isPrismLauncherInstalled, []);
  const isPrismInstalled = isPrismInstalledData ?? false;

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

  const revalidateServers = async () => {
    // Load favorite addresses
    const storedFavorites = await loadFavoriteServers(LocalStorage);
    setFavoriteAddresses(storedFavorites);

    // Load servers from all instances
    const favoriteInstanceIds = await loadFavoriteInstanceIds(LocalStorage);
    const instances: Instance[] = await loadInstances(favoriteInstanceIds);

    const allServers: Server[] = [];
    for (const instance of instances) {
      const parsed = await parseServersFromInstance(instance);
      allServers.push(
        ...parsed.map((s) => ({
          ...s,
          favorite: storedFavorites.includes(s.address),
        })),
      );
    }

    const favoriteServersOnly = allServers.filter((s) => storedFavorites.includes(s.address));

    // Deduplicate servers by IP address - keep only the first occurrence
    const uniqueServers = favoriteServersOnly.filter(
      (server, index, self) => index === self.findIndex((s) => s.address === server.address),
    );

    setServers(sortServers(uniqueServers, storedFavorites));
  };

  useAsyncEffect(async () => {
    if (isPrismInstalled) await revalidateServers();
  }, [isPrismInstalled]);

  return (
    <List
      searchBarPlaceholder={"Search favorite servers..."}
      {...(isPrismInstalled ? { isLoading: servers === undefined } : { isLoading: isPrismInstalledLoading })}
    >
      <When condition={isPrismInstalled}>
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
      </When>
      <Unless condition={isPrismInstalled}>
        <NoInstall />
      </Unless>
    </List>
  );
}
