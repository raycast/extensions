import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export function tryReadFile(path: string): string | undefined {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return undefined;
  }
}

export function tmuxConfigPaths(): readonly string[] {
  const home = homedir();
  const xdgConfig = process.env.XDG_CONFIG_HOME || join(home, ".config");

  return [join(home, ".tmux.conf"), join(xdgConfig, "tmux", "tmux.conf")];
}

export function readTmuxConfigs(): string[] {
  const contents: string[] = [];
  for (const path of tmuxConfigPaths()) {
    const text = tryReadFile(path);
    if (text) {
      contents.push(text);
    }
  }
  return contents;
}
