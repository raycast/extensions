import { environment, getPreferenceValues } from "@raycast/api";
import fs from "fs";
import { shellEnv } from "shell-env";
import which from "which";
import { Prompt } from "./types";

const CreateNextAppCommand = {
  npm: {
    executable: "npx",
    command: ["create-next-app@latest"],
  },
  yarn: {
    executable: "yarn",
    command: ["create", "next-app"],
  },
  pnpm: {
    executable: "pnpm",
    command: ["create", "next-app"],
  },
  bun: {
    executable: "bunx",
    command: ["create-next-app"],
  },
};
export function GetCreateNextAppCommand({ packageManager }: { packageManager: Preferences.Index["package-manager"] }) {
  return CreateNextAppCommand[packageManager];
}

export function GetDefaultPrompt<T extends Prompt extends Prompt<infer U> ? U : never>(type: T) {
  const preferences = getPreferenceValues<Preferences.Index>();
  return {
    workspace: type === "input" ? [preferences.workspace] : preferences.workspace,
    project: environment.isDevelopment ? "my-app" : "",
    importAlias: '"@/*',
    typescript: true,
    tailwind: true,
    eslint: true,
    prettier: true,
    app: true,
    srcDir: true,
  } as Prompt<T>;
}

export function PathExists({
  path,
  type,
}: {
  path: string;
  type?: "File" | "Directory" | "Symbolic Link" | "Block Device" | "Character Device" | "FIFO" | "Socket";
}): boolean {
  if (!path || !path.trim() || !fs.existsSync(path)) return false;
  if (!type) return true;

  const pathInfo = fs.lstatSync(path);
  if (type === "File") {
    return pathInfo.isFile();
  } else if (type === "Directory") {
    return pathInfo.isDirectory();
  } else if (type === "Symbolic Link") {
    return pathInfo.isSymbolicLink();
  } else if (type === "Block Device") {
    return pathInfo.isBlockDevice();
  } else if (type === "Character Device") {
    return pathInfo.isCharacterDevice();
  } else if (type === "FIFO") {
    return pathInfo.isFIFO();
  } else if (type === "Socket") {
    return pathInfo.isSocket();
  } else {
    throw new Error(`Unknown path type: ${pathInfo}`);
  }
}

export function GetCreateNextAppArguments({ prompt }: { prompt: Prompt }) {
  const args: string[] = [];

  args.push(`${prompt.workspace}/${prompt.project}`.replaceAll('"', '"'));
  if (prompt.importAlias) args.push(`--import-alias`, prompt.importAlias);
  args.push(prompt.typescript ? "--typescript" : "--javascript");
  if (prompt.tailwind) args.push("--tailwind");
  if (prompt.eslint) args.push("--eslint");
  if (prompt.app) args.push("--app");
  if (prompt.srcDir) args.push("--src-dir");

  return args;
}

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const ticks = "```";
  const newLine = "\n";

  const lines = [];
  lines.push(ticks);
  if (language?.trim()) lines.push(language.trim());
  lines.push(newLine);
  if (code.trim()) lines.push(code.trim());
  lines.push(newLine);
  lines.push(ticks);

  return lines.join("");
}

export async function GetExecutableInfo(executable: string) {
  const { PATH } = await shellEnv();
  const path = await which(executable, { nothrow: true, path: PATH });
  return {
    path,
    environment: {
      PATH,
    },
  };
}
