import {
  Action,
  ActionPanel,
  closeMainWindow,
  List,
  PopToRootType,
  LocalStorage,
  Icon,
  Keyboard,
  environment,
  Clipboard,
} from "@raycast/api";
import useAsyncEffect from "use-async-effect";
import { useState } from "react";
import * as path from "path";
import { When } from "react-if";
import {
  isPrismLauncherInstalled,
  loadInstances,
  loadFavoriteServers,
  saveFavoriteServers,
  parseServersFromInstance,
  sortServers,
  loadFavoriteInstanceIds,
  instancesPath,
} from "../utils/prism";
import { Server, Instance } from "../types";
import { joinServer, launchInstance } from "../utils/instance";

export default function JoinServer() {
  const [instances, setInstances] = useState<Instance[]>();
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [servers, setServers] = useState<Server[]>();
  const [isPrismInstalled, setIsPrismInstalled] = useState<boolean>();
  const [favoriteAddresses, setFavoriteAddresses] = useState<string[]>([]);

  // Toggle favorite status for a server
  const toggleFavorite = async (address: string) => {
    const newFavorites = favoriteAddresses.includes(address)
      ? favoriteAddresses.filter((a) => a !== address)
      : [...favoriteAddresses, address];

    setFavoriteAddresses(newFavorites);
    await saveFavoriteServers(LocalStorage, newFavorites);

    if (servers) {
      // Update the servers with favorite status
      const updatedServers = servers.map((server) => ({
        ...server,
        favorite: newFavorites.includes(server.address),
      }));

      // Sort servers with favorites at the top
      setServers(sortServers(updatedServers, newFavorites));
    }
  };

  // Load servers for a specific instance
  const loadInstanceServers = async (instance: Instance) => {
    const serversList = await parseServersFromInstance(instance);

    // Mark favorite servers
    const serversWithFavorites = serversList.map((server) => ({
      ...server,
      favorite: favoriteAddresses.includes(server.address),
    }));

    // Sort servers with favorites at the top
    setServers(sortServers(serversWithFavorites, favoriteAddresses));
  };

  useAsyncEffect(async () => {
    // Load favorite servers from local storage
    const parsedFavorites = await loadFavoriteServers(LocalStorage);
    setFavoriteAddresses(parsedFavorites);

    // Check if PrismLauncher is installed
    const installed = await isPrismLauncherInstalled();
    setIsPrismInstalled(installed);
    if (!installed) return;

    // Load instances (only those with servers)
    const favoriteInstanceIds = await loadFavoriteInstanceIds(LocalStorage);
    const instancesList = await loadInstances(favoriteInstanceIds, true);
    setInstances(instancesList);
  }, []);

  // Handle instance selection
  const handleInstanceSelect = async (instance: Instance) => {
    setSelectedInstance(instance);
    await loadInstanceServers(instance);
  };

  // If an instance is selected, show its servers
  if (selectedInstance) {
    return (
      <List
        searchBarPlaceholder={"Search servers..."}
        {...(isPrismInstalled ? { isLoading: servers === undefined } : {})}
      >
        <When condition={isPrismInstalled}>
          {servers && servers.length > 0 ? (
            servers.map((server, index) => (
              <List.Item
                key={`server-${index}`}
                title={server.name}
                subtitle={server.address}
                accessories={server.favorite ? [{ icon: Icon.Star }] : []}
                icon={
                  server.icon
                    ? {
                        source: server.icon,
                      }
                    : Icon.Network
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Join Server"
                      icon={Icon.Network}
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
                      title="Launch Instance"
                      icon={Icon.Rocket}
                      onAction={async () => {
                        await launchInstance(server.instanceId);
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
              title={"No servers found"}
              description={"No servers were found in this instance"}
            />
          )}
        </When>
      </List>
    );
  }

  // Show instances list
  return (
    <List
      searchBarPlaceholder={"Search instances..."}
      {...(isPrismInstalled ? { isLoading: instances === undefined } : {})}
    >
      <When condition={isPrismInstalled}>
        {instances &&
          instances.map((instance, index) => (
            <List.Item
              key={`instance-${index}`}
              title={instance.name}
              accessories={instance.favorite ? [{ icon: Icon.Star, tooltip: "Favorited" }] : []}
              icon={{
                source: instance.icon ?? path.join(environment.assetsPath, "instance-icon.png"),
              }}
              actions={
                <ActionPanel>
                  <Action
                    title="View Servers"
                    icon={Icon.AppWindowList}
                    onAction={() => handleInstanceSelect(instance)}
                  />
                  <Action
                    title="Launch Instance"
                    icon={Icon.Rocket}
                    onAction={async () => {
                      await launchInstance(instance.id);
                      await closeMainWindow({
                        popToRootType: PopToRootType.Immediate,
                        clearRootSearch: true,
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
      </When>
      <When condition={isPrismInstalled == false}>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={"Prism Launcher is not installed"}
          description={`Prism Launcher not installed or ${instancesPath} is not present`}
        />
      </When>
    </List>
  );
}
