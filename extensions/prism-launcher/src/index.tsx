import { Action, ActionPanel, environment, List } from "@raycast/api";
import useAsyncEffect from "use-async-effect";
import { useState } from "react";
import { ConfigIniParser } from "config-ini-parser";
import { Instance } from "./types";
import fs from "fs-extra";
import * as async from "modern-async";
import * as path from "path";
import * as child_process from "child_process";

export default function Command() {
  const [instances, setInstances] = useState<Instance[]>([]);

  useAsyncEffect(async () => {
    const instancesPath = path.join(process.env.HOME!, "Library", "Application Support", "PrismLauncher", "instances");

    // Get all folders in instances folder
    const instanceFolders = await async.asyncFilter(await fs.readdir(instancesPath), async (instanceId) => {
      const stats = await fs.stat(path.join(instancesPath, instanceId));
      return stats.isDirectory() && !["_LAUNCHER_TEMP", "_MMC_TEMP", ".LAUNCHER_TEMP"].includes(instanceId);
    });

    // Get all instances and their details
    setInstances(
      await async.asyncMap(instanceFolders, async (instanceId) => {
        const parser = new ConfigIniParser();
        const instanceFolder = path.join(instancesPath, instanceId);
        const instanceCfgStr = (await fs.readFile(path.join(instanceFolder, "instance.cfg"))).toString("utf-8");
        const instanceCfg = parser.parse(instanceCfgStr);

        return {
          name: instanceCfg.get("General", "name", instanceId),
          id: instanceId,
        };
      }),
    );
  }, []);

  return (
    <List>
      {instances.map((instance, index) => (
        <List.Item
          key={`instance-${index}`}
          title={instance.name}
          icon={{
            source: path.join(environment.assetsPath, "instance-icon.png"),
          }}
          actions={
            <ActionPanel>
              <Action
                title="Launch Instance"
                icon={"app-window-16"}
                onAction={() => {
                  child_process.exec(`open -a "PrismLauncher" --args --launch "${instance.id}"`);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
