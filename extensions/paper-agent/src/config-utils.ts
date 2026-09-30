import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import yaml from "js-yaml";

type YamlObject = Record<string, unknown>;
type DeliveryDirs = {
  paperDir: string;
  libraryDir: string;
};

export function readConfigObject(configPath: string): YamlObject | undefined {
  if (!configPath || !fs.existsSync(configPath)) {
    return undefined;
  }

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const loaded = yaml.load(raw);
    if (!loaded || typeof loaded !== "object" || Array.isArray(loaded)) {
      return undefined;
    }
    return loaded as YamlObject;
  } catch {
    return undefined;
  }
}

export function getPaperDirFromConfigObject(config: YamlObject): string {
  const delivery = config.delivery;
  if (!delivery || typeof delivery !== "object" || Array.isArray(delivery)) {
    return "";
  }
  const configPaperDir = (delivery as YamlObject).paper_dir;
  return typeof configPaperDir === "string" ? configPaperDir.trim() : "";
}

export function getLibraryDirFromConfigObject(config: YamlObject): string {
  const delivery = config.delivery;
  if (!delivery || typeof delivery !== "object" || Array.isArray(delivery)) {
    return "";
  }
  const configLibraryDir = (delivery as YamlObject).library_dir;
  return typeof configLibraryDir === "string" ? configLibraryDir.trim() : "";
}

export function resolvePaperDir(configPath: string, prefPaperDir: string): string {
  const preferred = prefPaperDir.trim();
  if (preferred) return preferred;

  const config = readConfigObject(configPath);
  if (!config) return "";
  return getPaperDirFromConfigObject(config);
}

export function resolveDeliveryDirs(configPath: string, prefPaperDir: string): DeliveryDirs {
  const preferred = prefPaperDir.trim();
  if (preferred) {
    return {
      paperDir: preferred,
      libraryDir: path.join(preferred, "library"),
    };
  }

  const config = readConfigObject(configPath);
  if (!config) {
    return { paperDir: "", libraryDir: "" };
  }

  const paperDir = getPaperDirFromConfigObject(config);
  const libraryDir = getLibraryDirFromConfigObject(config) || (paperDir ? path.join(paperDir, "library") : "");
  return { paperDir, libraryDir };
}

export function applyPaperDirOverride(config: YamlObject, prefPaperDir: string): YamlObject {
  const preferred = prefPaperDir.trim();
  if (!preferred) return JSON.parse(JSON.stringify(config)) as YamlObject;

  const merged = JSON.parse(JSON.stringify(config)) as YamlObject;
  if (!merged.delivery || typeof merged.delivery !== "object" || Array.isArray(merged.delivery)) {
    merged.delivery = {};
  }
  const delivery = merged.delivery as YamlObject;
  delivery.paper_dir = preferred;
  delivery.library_dir = path.join(preferred, "library");
  return merged;
}

export function withEffectiveConfigPath<T>(
  configPath: string,
  prefPaperDir: string,
  runner: (effectiveConfigPath: string) => T,
): T {
  const preferred = prefPaperDir.trim();
  if (!preferred) {
    throw new Error("Paper directory is required in extension Preferences.");
  }

  const config = readConfigObject(configPath);
  if (!config) {
    throw new Error("Config file is missing or invalid.");
  }

  let tempConfigPath = "";
  try {
    const merged = applyPaperDirOverride(config, preferred);
    tempConfigPath = path.join(
      os.tmpdir(),
      `paper-agent-raycast-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.yaml`,
    );
    fs.writeFileSync(tempConfigPath, yaml.dump(merged), "utf-8");
    return runner(tempConfigPath);
  } finally {
    if (tempConfigPath && fs.existsSync(tempConfigPath)) {
      try {
        fs.unlinkSync(tempConfigPath);
      } catch {
        // ignore cleanup errors
      }
    }
  }
}

export async function withEffectiveConfigPathAsync<T>(
  configPath: string,
  prefPaperDir: string,
  runner: (effectiveConfigPath: string) => Promise<T>,
): Promise<T> {
  const preferred = prefPaperDir.trim();
  if (!preferred) {
    throw new Error("Paper directory is required in extension Preferences.");
  }

  const config = readConfigObject(configPath);
  if (!config) {
    throw new Error("Config file is missing or invalid.");
  }

  let tempConfigPath = "";
  try {
    const merged = applyPaperDirOverride(config, preferred);
    tempConfigPath = path.join(
      os.tmpdir(),
      `paper-agent-raycast-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.yaml`,
    );
    fs.writeFileSync(tempConfigPath, yaml.dump(merged), "utf-8");
    return await runner(tempConfigPath);
  } finally {
    if (tempConfigPath && fs.existsSync(tempConfigPath)) {
      try {
        fs.unlinkSync(tempConfigPath);
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
