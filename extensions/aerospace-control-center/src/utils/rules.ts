import { copyFile, readFile, writeFile } from "fs/promises";
import { constants } from "fs";
import { parse } from "smol-toml";
import { aerospace, resolveConfigPath } from "./aerospace";
import { appIdForRule, commandsForRule, ruleBlocks, updateWindowRuleContent } from "./rule-config";

export type WindowRuleState = {
  exists: boolean;
  floating: boolean;
  workspace: string;
};

async function configFile(): Promise<string> {
  const path = await resolveConfigPath();
  if (!path) {
    throw new Error("No custom AeroSpace configuration was found. Create one or select it in extension preferences.");
  }
  return path;
}

export async function readWindowRule(bundleId: string): Promise<WindowRuleState> {
  const path = await configFile();
  const content = await readFile(path, "utf8");
  const block = ruleBlocks(content.split(/\r?\n/)).find((candidate) => appIdForRule(candidate) === bundleId);
  if (!block) return { exists: false, floating: false, workspace: "" };

  const commands = commandsForRule(block);
  const workspaceCommand = commands.find((command) => command.startsWith("move-node-to-workspace "));
  return {
    exists: true,
    floating: commands.includes("layout floating"),
    workspace: workspaceCommand?.slice("move-node-to-workspace ".length) || "",
  };
}

export async function saveWindowRule(options: {
  bundleId: string;
  appName: string;
  floating: boolean;
  workspace: string;
}): Promise<{ stdout: string; stderr: string }> {
  const path = await configFile();
  const content = await readFile(path, "utf8");
  const safeName = options.appName.replace(/[\r\n]+/g, " ").trim();
  const nextContent = updateWindowRuleContent(content, { ...options, appName: safeName });
  parse(nextContent);

  const backupPath = `${path}.raycast-backup`;
  await copyFile(path, backupPath, constants.COPYFILE_EXCL).catch((error) => {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EEXIST") throw error;
  });
  await writeFile(path, nextContent, "utf8");
  try {
    await aerospace(["reload-config"]);
  } catch (error) {
    await writeFile(path, content, "utf8");
    await aerospace(["reload-config"]).catch(() => undefined);
    throw new Error(
      `AeroSpace rejected the updated rule, so the original configuration was restored. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  return {
    stdout: `Saved rule for ${safeName}. Backup: ${backupPath}`,
    stderr: "",
  };
}
