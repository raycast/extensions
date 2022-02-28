import { ScriptCommand, ScriptMetadatas } from "./types";
import { chmod, copyFile, readFile, stat } from "fs/promises";
import { basename, resolve } from "path";
import { globbySync } from "globby";
import { environment } from "@raycast/api";
import { readdirSync } from "fs";

const metadataRegex = /@raycast\.(\w+)\s+(.+)$/gm;

export function parseMetadatas(script: string): ScriptMetadatas {
  const metadatas: Record<string, string> = {};
  const matches = [...script.matchAll(metadataRegex)];
  for (const match of matches) {
    const metadataTitle = match[1];
    metadatas[metadataTitle] = metadataTitle == "argument1" ? JSON.parse(match[2]) : match[2];
  }

  return metadatas as unknown as ScriptMetadatas;
}

export async function parseScriptCommands(): Promise<{ commands: ScriptCommand[]; invalid: string[] }> {
  if (readdirSync(environment.supportPath).length == 0) {
    await copyAssetsCommands();
  }
  const scriptPaths = globbySync(`${environment.supportPath}/**/*`).filter((path) => !path.startsWith("."));
  const commands = await Promise.all(
    scriptPaths.map(async (scriptPath) => {
      const script = await readFile(scriptPath, "utf8");
      const metadatas = parseMetadatas(script);
      return { path: scriptPath, metadatas };
    })
  );
  const res = { commands: [] as ScriptCommand[], invalid: [] as string[] };
  for (const command of commands) {
    if (command.metadatas.title && command.metadatas.argument1) {
      res.commands.push(command);
    } else {
      res.invalid.push(command.path);
    }
  }
  return res;
}

export async function copyAssetsCommands() {
  console.debug("Copying assets...");
  const assetsDir = resolve(environment.assetsPath, "commands");
  await Promise.all(
    globbySync(`${assetsDir}/**/*`).map(async (assetPath) => {
      const target = resolve(environment.supportPath, basename(assetPath));
      await copyFile(resolve(assetsDir, assetPath), target);
      await chmod(target, "755");
      console.debug(`Copied ${assetPath}`);
    })
  );
  console.debug("Copying of assets done!");
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
