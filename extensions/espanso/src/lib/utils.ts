import fse from "fs-extra";
import YAML from "yaml";
import path from "node:path";
import { exec, execSync } from "node:child_process";
import type { EspansoMatch, MultiTrigger, Label, Replacement, NormalizedEspansoMatch, EspansoConfig } from "./types";
import { getPreferenceValues } from "@raycast/api";

export function getEspansoCmd(): string {
  const { espansoPath } = getPreferenceValues<{ espansoPath?: string }>();
  return espansoPath && espansoPath.trim() !== "" ? espansoPath : "espanso";
}

export function execPromise(cmd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(cmd, (_error, stdout, stderr) => {
      if (_error) {
        reject(new Error(stderr || _error.message));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

function lastUpdatedDate(file: string) {
  const { mtime } = fse.statSync(file);
  return mtime.getTime();
}

export function getAndSortTargetFiles(espansoMatchDir: string): { file: string; mtime: number }[] {
  const targetFiles = fse
    .readdirSync(espansoMatchDir, { withFileTypes: true })
    .filter((dirent: fse.Dirent) => dirent.isFile() && path.extname(dirent.name).toLowerCase() === ".yml");

  const matchFilesTimes = targetFiles.map((targetFile: fse.Dirent) => {
    return { file: targetFile.name, mtime: lastUpdatedDate(path.join(espansoMatchDir, targetFile.name)) };
  });

  return matchFilesTimes.sort(
    (a: { file: string; mtime: number }, b: { file: string; mtime: number }) => b.mtime - a.mtime,
  );
}
export function formatMatch(espansoMatch: MultiTrigger & Label & Replacement) {
  const triggerList = espansoMatch.triggers.map((trigger) => `"${trigger}"`).join(", ");
  const labelLine = espansoMatch.label ? `\n    label: "${espansoMatch.label}"` : "";

  return `
  - triggers: [${triggerList}]${labelLine}
    replace: "${espansoMatch.replace}"
  `;
}

export function appendMatchToFile(fileContent: string, fileName: string, espansoMatchDir: string) {
  const filePath = path.join(espansoMatchDir, fileName);
  fse.appendFileSync(filePath, fileContent);

  return { fileName, filePath };
}

export function getMatches(espansoMatchDir: string, options?: { packagePath: boolean }): NormalizedEspansoMatch[] {
  const finalMatches: NormalizedEspansoMatch[] = [];
  const loadedFiles = new Set<string>();

  function readDirectory(dir: string) {
    const items = fse.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (options?.packagePath) {
          const packageFilePath = path.join(fullPath, "package.yml");
          if (fse.existsSync(packageFilePath) && fse.statSync(packageFilePath).isFile()) {
            processFile(packageFilePath);
          }
        } else {
          readDirectory(fullPath);
        }
      } else if (item.isFile() && path.extname(item.name).toLowerCase() === ".yml" && item.name !== ".DS_Store") {
        processFile(fullPath);
      }
    }
  }

  function processFile(filePath: string) {
    if (loadedFiles.has(filePath)) return;
    loadedFiles.add(filePath);
    const content = fse.readFileSync(filePath);
    const parsed = YAML.parse(content.toString()) ?? {};
    const matches: EspansoMatch[] = Array.isArray(parsed.matches) ? parsed.matches : [];

    if (Array.isArray(parsed.imports)) {
      for (const importPath of parsed.imports) {
        const resolvedPath = path.resolve(path.dirname(filePath), importPath);
        if (fse.existsSync(resolvedPath)) {
          processFile(resolvedPath);
        }
      }
    }

    // Derive category from relative path, matching UI logic
    const relPath = path.relative(espansoMatchDir, filePath);
    let category =
      relPath && !relPath.startsWith("..") && relPath !== ""
        ? relPath.split(path.sep)[0]?.replace(/\.yml$/, "")
        : path.basename(filePath, ".yml");
    // Capitalize category for UI consistency
    category = category.charAt(0).toUpperCase() + category.slice(1);
    finalMatches.push(
      ...matches.flatMap((obj: EspansoMatch) => {
        if ("trigger" in obj) {
          const { trigger, replace, form, label } = obj;
          return [{ triggers: [trigger], replace, form, label, filePath, category }];
        } else if ("triggers" in obj) {
          const { triggers, replace, form, label } = obj;
          return triggers.map((trigger: string) => ({ triggers: [trigger], replace, form, label, filePath, category }));
        } else if ("regex" in obj) {
          const { regex, replace, form, label } = obj;
          return [{ triggers: [regex], replace, form, label, filePath, category }];
        } else {
          return [];
        }
      }),
    );
  }

  readDirectory(espansoMatchDir);
  return finalMatches;
}

export function getEspansoConfig(): EspansoConfig {
  const configObject: EspansoConfig = { config: "", packages: "", runtime: "", match: "" };
  let configString = "";
  try {
    configString = execSync(`${getEspansoCmd()} path`, { encoding: "utf-8" });
  } catch (error) {
    throw new Error(`Failed to run 'espanso path': ${error}`);
  }

  configString.split("\n").forEach((item) => {
    const [key, value] = item.split(":");
    if (key && value) {
      const lowercaseKey = key.trim().toLowerCase() as keyof EspansoConfig;
      if (lowercaseKey in configObject) {
        configObject[lowercaseKey] = value.trim();
      }
    }
  });

  configObject.match = path.join(configObject.config, "match");
  return configObject;
}

export const sortMatches = (matches: NormalizedEspansoMatch[]): NormalizedEspansoMatch[] => {
  return matches.sort((a, b) => {
    if (a.label && b.label) {
      return a.label.localeCompare(b.label);
    } else if (a.label) {
      return -1;
    } else if (b.label) {
      return 1;
    } else {
      return a.triggers[0].localeCompare(b.triggers[0]);
    }
  });
};
