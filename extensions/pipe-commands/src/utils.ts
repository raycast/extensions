import { ScriptCommand, ScriptMetadatas, scriptModes } from "./types";
import { chmod, copyFile, readFile, stat } from "fs/promises";
import { basename, resolve } from "path";
import { globbySync } from "globby";
import { environment } from "@raycast/api";

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
  const defaultPaths = globbySync(`${environment.assetsPath}/commands/**/*`);
  const userPaths = globbySync(`${environment.supportPath}/**/*`);
  const scriptPaths = [...userPaths, ...defaultPaths].filter((path) => !path.startsWith("."));

  const commands = await Promise.all(
    scriptPaths.map(async (scriptPath) => {
      const script = await readFile(scriptPath, "utf8");
      const metadatas = parseMetadatas(script);
      return { path: scriptPath, content: script, metadatas };
    })
  );
  const res = { commands: [] as ScriptCommand[], invalid: [] as string[] };
  for (const command of commands) {
    if (command.metadatas.title && command.metadatas.argument1 && scriptModes.includes(command.metadatas.mode)) {
      res.commands.push({ ...command, user: command.path.startsWith(environment.supportPath) });
    } else {
      res.invalid.push(command.path);
    }
  }
  return res;
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

export function codeblock(code: string) {
  return ["```", code, "```"].join("\n");
}
