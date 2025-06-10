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
import { ConfigIniParser } from "config-ini-parser";
import { Instance } from "./types";
import fs from "fs-extra";
import * as async from "modern-async";
import * as path from "path";
import * as child_process from "child_process";
import { When } from "react-if";

const instancesPath = path.join(process.env.HOME!, "Library", "Application Support", "PrismLauncher", "instances");
const prismLauncherPath = fs.pathExistsSync(path.join("/Applications", "PrismLauncher.app"))
  ? path.join("/Applications", "PrismLauncher.app")
  : path.join("/Applications", "Prism Launcher.app");

export default function Command() {
  const [instances, setInstances] = useState<Instance[]>();
  const [isPrismInstalled, setIsPrismInstalled] = useState<boolean>();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // Toggle favorite status for an instance
  const toggleFavorite = async (instanceId: string) => {
    const newFavoriteIds = favoriteIds.includes(instanceId)
      ? favoriteIds.filter((id) => id !== instanceId)
      : [...favoriteIds, instanceId];

    setFavoriteIds(newFavoriteIds);
    await LocalStorage.setItem("favoriteInstanceIds", JSON.stringify(newFavoriteIds));

    if (instances) {
      const updatedInstances = instances.map((instance) => ({
        ...instance,
        favorite: newFavoriteIds.includes(instance.id),
      }));

      // Sort instances with favorites at the top
      setInstances(sortInstances(updatedInstances));
    }
  };

  // Sort instances with favorites at the top, then alphabetically
  const sortInstances = (instancesList: Instance[]) => {
    return instancesList.sort((a, b) => {
      // If one is favorite and the other is not, favorite comes first
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      // Otherwise sort alphabetically
      return a.name.localeCompare(b.name);
    });
  };

  useAsyncEffect(async () => {
    // Load favorite instances from local storage
    const storedFavorites = await LocalStorage.getItem<string>("favoriteInstanceIds");
    const parsedFavorites = storedFavorites ? JSON.parse(storedFavorites) : [];
    setFavoriteIds(parsedFavorites);

    // Check if PrismLauncher is installed
    const installed = (await fs.pathExists(prismLauncherPath)) && (await fs.pathExists(instancesPath));
    setIsPrismInstalled(installed);
    if (!installed) return;

    // Get all folders in instances folder
    const instanceFolders = await async.asyncFilter(await fs.readdir(instancesPath), async (instanceId) => {
      const stats = await fs.stat(path.join(instancesPath, instanceId));
      return stats.isDirectory() && !["_LAUNCHER_TEMP", "_MMC_TEMP", ".LAUNCHER_TEMP", ".tmp"].includes(instanceId);
    });

    // Get all instances and their details
    const instancesList = await async.asyncMap(instanceFolders, async (instanceId) => {
      const parser = new ConfigIniParser();
      const instanceFolder = path.join(instancesPath, instanceId);
      const instanceCfgStr = (await fs.readFile(path.join(instanceFolder, "instance.cfg"))).toString("utf-8");
      const instanceCfg = parser.parse(instanceCfgStr);

      const paths = await async.asyncMap(["minecraft", ".minecraft"], async (subfolder) =>
        path.join(instanceFolder, subfolder, "icon.png"),
      );
      const iconPath = await async.asyncFind(paths, async (p) => await fs.pathExists(p));

      return {
        name: instanceCfg.get("General", "name", instanceId),
        id: instanceId,
        icon: iconPath,
        favorite: parsedFavorites.includes(instanceId),
      };
    });

    // Sort instances with favorites at the top, then alphabetically
    setInstances(sortInstances(instancesList));
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
                      const minecraftPath = path.join(instancesPath, instance.id, "minecraft");
                      if (await fs.pathExists(minecraftPath)) {
                        child_process.exec(`open "${minecraftPath}"`);
                      } else {
                        child_process.exec(`open "${path.join(instancesPath, instance.id, ".minecraft")}"`);
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
