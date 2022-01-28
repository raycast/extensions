import { ScriptCommand, ScriptMetadatas } from "./types";
import { chmod, copyFile, readdir, readFile, stat } from "fs/promises";
import { readdirSync } from "fs";
import { resolve } from "path";
import { environment } from "@raycast/api";

const metadataRegex = /@raycast\.(\w+)\s+(.+)$/gm;

export function parseMetadatas(script: string): ScriptMetadatas {
  const metadatas: Record<string, string> = {};
  const matches = [...script.matchAll(metadataRegex)];
  for (const match of matches) {
    const metadataTitle = match[1];
    const metatataValue = metadataTitle == "selection" ? JSON.parse(match[2]) : match[2];
    metadatas[metadataTitle] = metatataValue;
  }

  return (metadatas as unknown) as ScriptMetadatas;
}

export async function parseScriptCommands(scriptFolder: string): Promise<ScriptCommand[]> {
  const paths = await readdir(scriptFolder);
  const commands = await Promise.all(
    paths.map(async (path) => {
      const scriptPath = `${scriptFolder}/${path}`;
      const script = await readFile(scriptPath, "utf8");
      const metadatas = parseMetadatas(script);
      return { path: scriptPath, metadatas };
    })
  );
  return commands.filter((command) => command.metadatas.title && command.metadatas.selection);
}

export async function copyAssetsCommands() {
  const assetsDir = resolve(environment.assetsPath, "commands");
  await Promise.all(
    readdirSync(assetsDir).map(async (scriptName) => {
      await copyFile(resolve(assetsDir, scriptName), resolve(environment.supportPath, scriptName));
      await chmod(resolve(environment.supportPath, scriptName), 0o755);
    })
  );
}

export async function sortByAccessTime(commands: ScriptCommand[]): Promise<ScriptCommand[]> {
  const commandsWithAccessTime = await Promise.all(
    commands.map(async (command) => {
      const stats = await stat(command.path);
      return { ...command, accessTime: stats.atimeMs };
    })
  );
  return commandsWithAccessTime.sort((a, b) => b.accessTime - a.accessTime);
}
