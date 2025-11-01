import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { exec } from "child_process";
import fs from "fs";
import z from "zod";

const filteredArray = <T extends z.ZodSchema>(schema: T) =>
  z
    .array(z.unknown())
    .transform((items) => items?.filter((item): item is z.infer<T> => schema.safeParse(item).success));

const schema = z.object({
  components: filteredArray(
    z.object({
      cachedName: z.enum(["Minecraft", "Forge", "Fabric Loader"]),
      version: z.string(),
    }),
  ),
});

const prismDirWindows = `${process.env.HOME}/AppData/Roaming/PrismLauncher`;
const prismExecPathWindows = `${process.env.HOME}/AppData/Local/Programs/PrismLauncher/prismlauncher.exe`;
const prismDirMac = `${process.env.HOME}/Library/Application Support/PrismLauncher`;
const prismExecPathMac = `${process.env.HOME}/Library/Application Support/PrismLauncher/prismlauncher.app`;

const prismDir = process.platform === "win32" ? prismDirWindows : prismDirMac;
const prismExecPath = process.platform === "win32" ? prismExecPathWindows : prismExecPathMac;

export default function Command() {
  if (!fs.existsSync(prismDir)) {
    return <Detail markdown="# Prism Launcher not found" />;
  }

  const instancesDir = `${prismDir}/instances`;
  if (!fs.existsSync(instancesDir)) {
    return <Detail markdown="# No instances found" />;
  }

  const instances = fs
    .readdirSync(instancesDir)
    .filter((f) => f !== ".LAUNCHER_TEMP" && fs.statSync(`${instancesDir}/${f}`).isDirectory());
  const instanceData = getInstances(instances, instancesDir);
  return (
    <List>
      {instanceData.map((instance, index) => {
        return (
          <List.Item
            key={index}
            title={instance.name}
            icon={Icon.GameController}
            accessories={[
              {
                text: instance.mcSub,
              },
              {
                text: instance.forgeSub,
              },
              { text: instance.fabricSub },
            ]}
            actions={
              <ActionPanel title="Instance Actions">
                <Action
                  title={`Launch ${instance.name}`}
                  icon={Icon.Play}
                  onAction={() => {
                    exec(`"${prismExecPath}" --launch "${instance.name}"`);
                  }}
                />
                <Action.ShowInFinder
                  title={`Show ${instance.name} in File Manager`}
                  icon={Icon.Folder}
                  path={`${instancesDir}/${instance.name}/.minecraft`}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function getInstances(instances: string[], instancesDir: string) {
  return instances.map((instance) => {
    const mmcPack = `${instancesDir}/${instance}/mmc-pack.json`;

    const mmcPackContent = fs.readFileSync(mmcPack, "utf-8");
    const { error, data } = schema.safeParse(JSON.parse(mmcPackContent));

    if (error || !data) {
      return {
        name: instance,
        mcSub: null,
        forgeSub: null,
        fabricSub: null,
      };
    }

    const mcVersion = data.components.find((c) => c.cachedName === "Minecraft")?.version;
    const forgeVersion = data.components.find((c) => c.cachedName === "Forge")?.version;
    const fabricVersion = data.components.find((c) => c.cachedName === "Fabric Loader")?.version;

    const mcSub = mcVersion ? `MC: ${mcVersion}` : null;
    const forgeSub = forgeVersion ? `Forge: ${forgeVersion}` : null;
    const fabricSub = fabricVersion ? `Fabric: ${fabricVersion}` : null;

    return {
      name: instance,
      mcSub,
      forgeSub,
      fabricSub,
    };
  });
}
