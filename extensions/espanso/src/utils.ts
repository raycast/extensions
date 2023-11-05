import fse from "fs-extra";
import path from "path";
import { $ } from "zx";
import { EspansoMatch, MultiTrigger, Replacement, NormalizedEspansoMatch, EspansoConfig } from "./types";
import YAML from "yaml";

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
  let matchFiles: string[];
  const finalMatches: NormalizedEspansoMatch[] = [];

  if (options && options.packagePath) {
    matchFiles = fse
      .readdirSync(espansoMatchDir)
      .filter((path) => path != ".DS_Store")
      .map((packageDir) => path.join(espansoMatchDir, packageDir, "package.yml"));
  } else {
    matchFiles = fse
      .readdirSync(espansoMatchDir)
      .filter((fileName) => {
        const filePath = path.join(espansoMatchDir, fileName);
        return fse.statSync(filePath).isFile() && path.extname(fileName).toLowerCase() === ".yml";
      })
      .map((fileName) => path.join(espansoMatchDir, fileName));
  }

  for (const matchFile of matchFiles) {
    const content = fse.readFileSync(matchFile);
    const matchesObj: { matches: EspansoMatch[] } = YAML.parse(content.toString());
    finalMatches.push(
      ...matchesObj.matches.flatMap((obj: EspansoMatch) => {
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

  $.verbose = false;
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
