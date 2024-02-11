import fse from "fs-extra";
import path from "path";
import { $ } from "zx";
import { EspansoMatch, MultiTrigger, Replacement, NormalizedEspansoMatch, EspansoConfig } from "./types";
import YAML from "yaml";
$.verbose = false;

function lastUpdatedDate(file: string) {
  const { mtime } = fse.statSync(file);

  return mtime.getTime();
}

export function getAndSortTargetFiles(espansoMatchDir: string): { file: string; mtime: number }[] {
  const targetFiles = fse
    .readdirSync(espansoMatchDir, { withFileTypes: true })
    .filter((dirent: fse.Dirent) => dirent.isFile() && path.extname(dirent.name).toLowerCase() === ".yml");

  const matchFilesTimes = targetFiles.map((targetFile) => {
    return { file: targetFile.name, mtime: lastUpdatedDate(path.join(espansoMatchDir, targetFile.name)) };
  });

  return matchFilesTimes.sort((a, b) => b.mtime - a.mtime);
}

export function formatMatch(espansoMatch: MultiTrigger & Replacement) {
  const triggerList = espansoMatch.triggers.map((trigger) => `"${trigger}"`).join(", ");

  return `
  - triggers: [${triggerList}]
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

  const matchFiles = fse
    .readdirSync(espansoMatchDir)
    .filter((fileName) => (options?.packagePath ? true : path.extname(fileName).toLowerCase() === ".yml")) // Filter based on options
    .filter((fileName) => fileName !== ".DS_Store")
    .map((fileName) => {
      const filePath = path.join(espansoMatchDir, fileName);
      return options?.packagePath ? path.join(filePath, "package.yml") : filePath;
    })
    .filter((filePath) => !options?.packagePath || fse.statSync(filePath).isFile());

  for (const matchFile of matchFiles) {
    const content = fse.readFileSync(matchFile);

    const { matches = [] }: { matches?: EspansoMatch[] } = YAML.parse(content.toString()) || {};

    finalMatches.push(
      ...matches.flatMap((obj: EspansoMatch) => {
        if ("trigger" in obj) {
          const { trigger, replace, label } = obj;
          return [{ triggers: [trigger], replace, label }];
        } else if ("triggers" in obj) {
          const { triggers, replace, label } = obj;
          return triggers.map((trigger: string) => ({ triggers: [trigger], replace, label }));
        } else if ("regex" in obj) {
          const { regex, replace, label } = obj;
          return [{ triggers: [regex], replace, label }];
        } else {
          return [];
        }
      }),
    );
  }

  return finalMatches;
}

export async function getEspansoConfig(): Promise<EspansoConfig> {
  const configObject: EspansoConfig = {
    config: "",
    packages: "",
    runtime: "",
    match: "",
  };

  const { stdout: configString } = await $`espanso path`;

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
      return -1; // a has label, b does not
    } else if (b.label) {
      return 1; // b has label, a does not
    } else {
      return a.triggers[0].localeCompare(b.triggers[0]);
    }
  });
};
