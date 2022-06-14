import { ScriptCommand, ScriptMetadatas } from "./types";

import { readFile, stat } from "fs/promises";
import { resolve } from "path";
import { Validator } from "jsonschema";
import { globbySync } from "globby";
import { environment, getPreferenceValues } from "@raycast/api";
import untildify from "untildify";
import { readFileSync } from "fs";

const metadataRegex = /@raycast\.(\w+)\s+(.+)$/gm;

export function parseMetadatas(script: string): ScriptMetadatas {
  const metadatas: Record<string, string> = {};
  const matches = [...script.matchAll(metadataRegex)];
  for (const match of matches) {
    const metadataTitle = match[1];
    metadatas[metadataTitle] = ["argument1", "needsConfirmation"].includes(metadataTitle)
      ? JSON.parse(match[2])
      : match[2];
  }

  return metadatas as unknown as ScriptMetadatas;
}

export interface InvalidCommand {
  path: string;
  content: string;
  errors: string[];
}

export async function parseScriptCommands(): Promise<{
  commands: ScriptCommand[];
  invalid: InvalidCommand[];
}> {
  let { pipeCommandsFolder = environment.supportPath } = getPreferenceValues<{ pipeCommandsFolder: string }>();
  pipeCommandsFolder = untildify(pipeCommandsFolder);
  const defaultPaths = globbySync(`${environment.assetsPath}/commands/**/*`);
  const userPaths = globbySync(`${pipeCommandsFolder}/**/*`);
  const scriptPaths = [...userPaths, ...defaultPaths].filter(
    (path) => !(path.startsWith(".") || path.endsWith(".png") || path.endsWith(".svg"))
  );

  const commands = await Promise.all(
    scriptPaths.map(async (scriptPath) => {
      const script = await readFile(scriptPath, "utf8");
      const metadatas = parseMetadatas(script);
      return { path: scriptPath, content: script, metadatas };
    })
  );

  const schema = JSON.parse(readFileSync(resolve(environment.assetsPath, "schema.json"), "utf-8"));
  const validator = new Validator();

  const valids = [] as ScriptCommand[];
  const invalid = [] as InvalidCommand[];
  for (const command of commands) {
    const res = validator.validate(command.metadatas, schema);
    if (res.valid) {
      valids.push({ ...command, user: command.path.startsWith(pipeCommandsFolder) });
    } else {
      invalid.push({ path: command.path, content: command.content, errors: res.errors.map((err) => err.stack) });
    }
  }

  return { commands: valids, invalid };
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
