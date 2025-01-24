import fs from "node:fs";
import path from "path";
import { EspansoMatch, MultiTrigger, Label, Replacement, NormalizedEspansoMatch, EspansoConfig } from "./types";
import YAML from "yaml";
import { espansoCli } from "./espanso";

function lastUpdatedDate(file: string) {
  const { mtime } = fs.statSync(file);

  return mtime.getTime();
}

export function getAndSortTargetFiles(espansoMatchDir: string): { file: string; mtime: number }[] {
  const targetFiles = fs
    .readdirSync(espansoMatchDir, { withFileTypes: true })
    .filter((dirent: fs.Dirent) => dirent.isFile() && path.extname(dirent.name).toLowerCase() === ".yml");

  const matchFilesTimes = targetFiles.map((targetFile) => {
    return { file: targetFile.name, mtime: lastUpdatedDate(path.join(espansoMatchDir, targetFile.name)) };
  });

  return matchFilesTimes.sort((a, b) => b.mtime - a.mtime);
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
  fs.appendFileSync(filePath, fileContent);

  return { fileName, filePath };
}

export function getMatches(espansoMatchDir: string, options?: { packagePath: boolean }): NormalizedEspansoMatch[] {
  const finalMatches: NormalizedEspansoMatch[] = [];

  function readDirectory(dir: string) {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        if (options?.packagePath) {
          const packageFilePath = path.join(fullPath, "package.yml");
          if (fs.existsSync(packageFilePath) && fs.statSync(packageFilePath).isFile()) {
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
    const content = fs.readFileSync(filePath);
    const { matches = [] }: { matches?: EspansoMatch[] } = YAML.parse(content.toString()) || {};

    finalMatches.push(
      ...matches.flatMap((obj: EspansoMatch) => {
        if ("trigger" in obj) {
          const { trigger, replace, form, label } = obj;
          return [{ triggers: [trigger], replace, form, label, filePath }];
        } else if ("triggers" in obj) {
          const { triggers, replace, form, label } = obj;
          return triggers.map((trigger: string) => ({ triggers: [trigger], replace, form, label, filePath }));
        } else if ("regex" in obj) {
          const { regex, replace, form, label } = obj;
          return [{ triggers: [regex], replace, form, label, filePath }];
        } else {
          return [];
        }
      }),
    );
  }

  readDirectory(espansoMatchDir);

  return finalMatches;
}

export async function getEspansoConfig(): Promise<EspansoConfig> {
  const configObject: EspansoConfig = {
    config: "",
    packages: "",
    runtime: "",
    match: "",
  };

  const { stdout: configString } = await espansoCli("path");

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
