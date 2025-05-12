import { Action, ActionPanel, closeMainWindow, environment, List, PopToRootType } from "@raycast/api";
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

  useAsyncEffect(async () => {
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
    setInstances(
      await async.asyncMap(instanceFolders, async (instanceId) => {
        const parser = new ConfigIniParser();
        const instanceFolder = path.join(instancesPath, instanceId);
        const instanceCfgStr = (await fs.readFile(path.join(instanceFolder, "instance.cfg"))).toString("utf-8");
        const instanceCfg = parser.parse(instanceCfgStr);

        const iconPath = path.join(instanceFolder, "minecraft", "icon.png");

        return {
          name: instanceCfg.get("General", "name", instanceId),
          id: instanceId,
          icon: (await fs.pathExists(iconPath)) ? iconPath : undefined,
        };
      }),
    );
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
