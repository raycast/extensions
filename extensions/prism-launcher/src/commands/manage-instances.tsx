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
  Toast,
  showToast,
  open,
} from "@raycast/api";
import useAsyncEffect from "use-async-effect";
import { useState } from "react";
import { Instance } from "../types";
import * as path from "path";
import { When } from "react-if";
import {
  isPrismLauncherInstalled,
  loadFavoriteInstanceIds,
  saveFavoriteInstanceIds,
  loadInstances,
  sortInstances,
  getMinecraftFolderPath,
  instancesPath,
  isWin,
} from "../utils/prism";
import { launchInstance, showInstance } from "../utils/instance";

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
                    icon={Icon.Rocket}
                    onAction={async () => {
                      await launchInstance(instance.id);
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
                    icon={Icon.AppWindowList}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                    onAction={async () => {
                      await showInstance(instance.id);
                      await closeMainWindow({
                        popToRootType: PopToRootType.Immediate,
                        clearRootSearch: true,
                      });
                    }}
                  />
                  <Action
                    title={`Open Minecraft Folder in ${isWin ? "File Explorer" : "Finder"}`}
                    icon={Icon.Finder}
                    shortcut={{ modifiers: ["shift", "cmd"], key: "o" }}
                    onAction={async () => {
                      const minecraftPath = await getMinecraftFolderPath(instance.id);
                      if (!minecraftPath) {
                        await showToast({ style: Toast.Style.Failure, title: "Failed to locate Minecraft folder" });
                        return;
                      }
                      open(minecraftPath);
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
