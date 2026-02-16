import os from "os";
import path from "path";

function defaultPetConfigPath(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME?.trim();
  if (xdgConfigHome) {
    return path.join(xdgConfigHome, "pet", "config.toml");
  }
  return path.join(os.homedir(), ".config", "pet", "config.toml");
}

function defaultSnippetPath(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME?.trim();
  if (xdgConfigHome) {
    return path.join(xdgConfigHome, "pet", "snippet.toml");
  }
  return path.join(os.homedir(), ".config", "pet", "snippet.toml");
}

function expandHome(input: string): string {
  if (input === "~") {
    return os.homedir();
  }
  if (input.startsWith("~/")) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}

export function resolveOptionalPath(input?: string): string | undefined {
  const raw = (input ?? "").trim();
  if (!raw) {
    return undefined;
  }
  return path.resolve(expandHome(raw));
}

export function resolveSnippetFilePath(input?: string): string {
  const raw = (input ?? "").trim() || defaultSnippetPath();
  const expanded = expandHome(raw);
  return path.resolve(expanded);
}

export function resolvePetConfigPath(input?: string): string {
  const raw = (input ?? "").trim() || defaultPetConfigPath();
  const expanded = expandHome(raw);
  return path.resolve(expanded);
}
