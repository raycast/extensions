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
import useAsyncEffect from "use-async-effect";
import { useState } from "react";
import * as child_process from "child_process";
import { When } from "react-if";
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

  useAsyncEffect(async () => {
    // Load favorite server addresses
    const storedFavorites = await loadFavoriteServers(LocalStorage);
    setFavoriteAddresses(storedFavorites);

    // Check Prism presence
    const installed = await isPrismLauncherInstalled();
    setIsPrismInstalled(installed);
    if (!installed) return;

    // Load instances (include all; we will filter servers by favorites)
    const favoriteInstanceIds = await loadFavoriteInstanceIds(LocalStorage);
    const instances: Instance[] = await loadInstances(favoriteInstanceIds);

    // Load servers from all instances
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

    // Keep only favorites and sort
    const favoriteServersOnly = allServers.filter((s) => storedFavorites.includes(s.address));
    setServers(sortServers(favoriteServersOnly, storedFavorites));
  }, []);

  return (
    <List
      searchBarPlaceholder={"Search favorite servers..."}
      {...(isPrismInstalled ? { isLoading: servers === undefined } : {})}
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
                      child_process.exec(
                        `open -b "org.prismlauncher.PrismLauncher" --args --launch "${server.instanceId}" --server "${server.address}"`,
                      );
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
            icon={"server-stack-16"}
            title={"No favorite servers"}
            description={"Mark servers as favorites to see them here"}
          />
        )}
      </When>
    </List>
  );
}
