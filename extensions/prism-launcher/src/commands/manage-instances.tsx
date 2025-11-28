import {
  Action,
  ActionPanel,
  closeMainWindow,
  environment,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  open,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import * as path from "path";
import { useState } from "react";
import { Unless, When } from "react-if";
import useAsyncEffect from "use-async-effect";
import type { Instance } from "../types";
import { launchInstance, showInstance } from "../utils/instance";
import {
  getMinecraftFolderPath,
  isPrismLauncherInstalled,
  isWin,
  loadFavoriteInstanceIds,
  loadInstances,
  saveFavoriteInstanceIds,
  sortInstances,
} from "../utils/prism";
import NoInstall from "./no-install";

export default function ManageInstances() {
  const { data: isPrismInstalledData } = usePromise(isPrismLauncherInstalled, []);
  const isPrismInstalled = isPrismInstalledData ?? false;

  const [instances, setInstances] = useState<Instance[]>();
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

  const revalidateInstances = async () => {
    // Load favorite instances from local storage
    const parsedFavorites = await loadFavoriteInstanceIds(LocalStorage);
    setFavoriteIds(parsedFavorites);

    // Load instances
    const instancesList = await loadInstances(parsedFavorites);
    setInstances(instancesList);
  };

  useAsyncEffect(async () => {
    if (isPrismInstalled) await revalidateInstances();
  }, [isPrismInstalled]);

  return (
    <List
      searchBarPlaceholder={"Search by instance name"}
      {...(isPrismInstalled ? { isLoading: instances === undefined } : {})}
    >
      <When condition={isPrismInstalled}>
        {instances?.map((instance, index) => (
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
      <Unless condition={isPrismInstalled}>
        <NoInstall />
      </Unless>
    </List>
  );
}
