import {
  Action,
  ActionPanel,
  closeMainWindow,
  environment,
  List,
  PopToRootType,
  LocalStorage,
  Icon,
  Keyboard,
} from "@raycast/api";
import useAsyncEffect from "use-async-effect";
import { useState } from "react";
import { Instance } from "../types";
import * as path from "path";
import * as child_process from "child_process";
import { When } from "react-if";
import {
  isPrismLauncherInstalled,
  loadFavoriteInstanceIds,
  saveFavoriteInstanceIds,
  loadInstances,
  sortInstances,
  getMinecraftFolderPath,
  instancesPath,
} from "../utils/prism";

export default function ManageInstances() {
  const [instances, setInstances] = useState<Instance[]>();
  const [isPrismInstalled, setIsPrismInstalled] = useState<boolean>();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // Toggle favorite status for an instance
  const toggleFavorite = async (instanceId: string) => {
    const newFavoriteIds = favoriteIds.includes(instanceId)
      ? favoriteIds.filter((id) => id !== instanceId)
      : [...favoriteIds, instanceId];

    setFavoriteIds(newFavoriteIds);
    await saveFavoriteInstanceIds(LocalStorage, newFavoriteIds);

    if (instances) {
      const updatedInstances = instances.map((instance) => ({
        ...instance,
        favorite: newFavoriteIds.includes(instance.id),
      }));

      // Sort instances with favorites at the top
      setInstances(sortInstances(updatedInstances));
    }
  };

  useAsyncEffect(async () => {
    // Load favorite instances from local storage
    const parsedFavorites = await loadFavoriteInstanceIds(LocalStorage);
    setFavoriteIds(parsedFavorites);

    // Check if PrismLauncher is installed
    const installed = await isPrismLauncherInstalled();
    setIsPrismInstalled(installed);
    if (!installed) return;

    // Load instances
    const instancesList = await loadInstances(parsedFavorites);
    setInstances(instancesList);
  }, []);

  return (
    <List
      searchBarPlaceholder={"Search by instance name"}
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
                    title="Launch Instance"
                    icon={"app-window-16"}
                    onAction={async () => {
                      child_process.exec(`open -b "org.prismlauncher.PrismLauncher" --args --launch "${instance.id}"`);
                      await closeMainWindow({
                        popToRootType: PopToRootType.Immediate,
                        clearRootSearch: true,
                      });
                    }}
                  />
                  <Action
                    title={instance.favorite ? "Remove from Favorites" : "Add to Favorites"}
                    icon={instance.favorite ? Icon.StarDisabled : Icon.Star}
                    onAction={() => toggleFavorite(instance.id)}
                    shortcut={Keyboard.Shortcut.Common.Pin}
                  />
                  <Action
                    title="Open Instance Window"
                    icon={"app-window-list-16"}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                    onAction={async () => {
                      child_process.exec(`open -b "org.prismlauncher.PrismLauncher" --args --show "${instance.id}"`);
                      await closeMainWindow({
                        popToRootType: PopToRootType.Immediate,
                        clearRootSearch: true,
                      });
                    }}
                  />
                  <Action
                    title="Open Minecraft Folder in Finder"
                    icon={Icon.Finder}
                    shortcut={{ modifiers: ["shift", "cmd"], key: "o" }}
                    onAction={async () => {
                      const minecraftPath = await getMinecraftFolderPath(instance.id);
                      if (minecraftPath) {
                        child_process.exec(`open "${minecraftPath}"`);
                      } else {
                        child_process.exec(`open "${path.join(instancesPath, instance.id)}"`);
                      }
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
          icon={"x-mark-circle-16"}
          title={"Prism Launcher is not installed"}
          description={`Prism Launcher not installed or ${instancesPath} is not present`}
        />
      </When>
    </List>
  );
}
