import { join } from "node:path";
import { readFile, stat } from "node:fs/promises";
import { parse } from "ini";

interface Submodule {
  path: string;
  url: string;
}

export type SubmoduleConfig = Record<string, Submodule>;

export async function hasSubmodules(currentDir?: string): Promise<boolean> {
  if (!currentDir) {
    return false;
  }

  const gitModules = join(currentDir, ".gitmodules");
  return stat(gitModules)
    .then((res) => res.isFile())
    .catch(() => false);
}

export async function submodulesConfig(currentDir?: string): Promise<SubmoduleConfig | null> {
  if (!currentDir) {
    return null;
  }

  const gitModules = join(currentDir, ".gitmodules");
  let submodules: SubmoduleConfig;
  try {
    const contents = await readFile(gitModules, "utf-8");
    submodules = parse(contents);
  } catch {
    return null;
  }

  return submodules;
}

export function parseSubmoduleKey(key: string): string | undefined {
  return key.match(/submodule "(?<keyName>.*)"/)?.groups?.["keyName"];
}
