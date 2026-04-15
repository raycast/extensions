import fse from "fs-extra";
import YAML from "yaml";
import path from "node:path";
import { exec, execFile, execSync } from "node:child_process";
import { promisify } from "node:util";
import type { EspansoMatch, EspansoVar, MultiTrigger, Label, NormalizedEspansoMatch, EspansoConfig } from "./types";
import { Clipboard, getPreferenceValues } from "@raycast/api";
import { capitalCase } from "change-case";

const ACRONYMS = [
  "AI",
  "API",
  "UI",
  "UX",
  "URL",
  "HTML",
  "CSS",
  "JS",
  "TS",
  "SQL",
  "REST",
  "HTTP",
  "HTTPS",
  "JSON",
  "XML",
  "PDF",
  "CSV",
  "CLI",
  "GUI",
  "SDK",
  "IDE",
  "AWS",
  "GCP",
  "iOS",
  "macOS",
  "OS",
  "RAM",
  "ROM",
  "CPU",
  "GPU",
  "USB",
  "DVD",
  "CD",
  "SSH",
  "FTP",
  "SMTP",
  "DNS",
  "VPN",
  "IP",
  "TCP",
  "UDP",
  "AJAX",
  "CRUD",
  "JWT",
  "OAuth",
  "SaaS",
  "PaaS",
  "IaaS",
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatCategoryName(category: string, separator: string = " · "): string {
  if (category.includes(separator)) {
    return category
      .split(separator)
      .map((part) => {
        let formatted = capitalCase(part);
        ACRONYMS.forEach((acronym) => {
          const regex = new RegExp(`\\b${escapeRegex(acronym)}\\b`, "gi");
          formatted = formatted.replace(regex, acronym);
        });
        return formatted;
      })
      .join(separator);
  }

  let formatted = capitalCase(category);
  ACRONYMS.forEach((acronym) => {
    const regex = new RegExp(`\\b${escapeRegex(acronym)}\\b`, "gi");
    formatted = formatted.replace(regex, acronym);
  });
  return formatted;
}

export function getEspansoCmd(): string {
  const { espansoPath } = getPreferenceValues<{ espansoPath?: string }>();
  return espansoPath && espansoPath.trim() !== "" ? espansoPath : "espanso";
}

export const execPromise = promisify(exec);
const execFilePromise = promisify(execFile);

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
export function formatMatch(espansoMatch: MultiTrigger & Label & { replace: string }) {
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

    const relPath = path.relative(espansoMatchDir, filePath);
    const category =
      relPath && !relPath.startsWith("..") && relPath !== ""
        ? relPath.split(path.sep)[0]?.replace(/\.yml$/, "")
        : path.basename(filePath, ".yml");
    finalMatches.push(
      ...matches.flatMap((obj: EspansoMatch) => {
        if ("trigger" in obj) {
          const { trigger, replace, image_path, form, label, vars } = obj;
          return [{ triggers: [trigger], replace, image_path, form, label, vars, filePath, category }];
        } else if ("triggers" in obj) {
          const { triggers, replace, image_path, form, label, vars } = obj;
          return [{ triggers, replace, image_path, form, label, vars, filePath, category }];
        } else if ("regex" in obj) {
          const { regex, replace, image_path, form, label, vars } = obj;
          return [{ triggers: [regex], replace, image_path, form, label, vars, filePath, category }];
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

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatStrftime = (date: Date, format: string): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return format
    .replace("%%", "\x00")
    .replace("%Y", String(date.getFullYear()))
    .replace("%y", String(date.getFullYear()).slice(-2))
    .replace("%m", pad(date.getMonth() + 1))
    .replace("%d", pad(date.getDate()))
    .replace("%e", String(date.getDate()))
    .replace("%H", pad(date.getHours()))
    .replace("%I", pad(date.getHours() % 12 || 12))
    .replace("%M", pad(date.getMinutes()))
    .replace("%S", pad(date.getSeconds()))
    .replace("%p", date.getHours() < 12 ? "AM" : "PM")
    .replace("%P", date.getHours() < 12 ? "am" : "pm")
    .replace("%A", WEEKDAYS[date.getDay()])
    .replace("%a", WEEKDAYS[date.getDay()].slice(0, 3))
    .replace("%B", MONTHS[date.getMonth()])
    .replace("%b", MONTHS[date.getMonth()].slice(0, 3))
    .replace("%h", MONTHS[date.getMonth()].slice(0, 3))
    .replace("%n", "\n")
    .replace("%t", "\t")
    .replace("\x00", "%");
};

const evaluateVar = async (v: EspansoVar): Promise<string> => {
  switch (v.type) {
    case "date":
      return formatStrftime(new Date(), v.params?.format ?? "%Y-%m-%d");
    case "shell": {
      if (!v.params?.cmd) return `{{${v.name}}}`;
      try {
        const rawShell = typeof v.params.shell === "string" && v.params.shell.trim() ? v.params.shell.trim() : "zsh";
        const shellBase = rawShell.includes("/") ? rawShell.split("/").pop()! : rawShell;
        const interactive = shellBase === "zsh" || shellBase === "bash";
        const shellArgs = interactive ? [rawShell, "-i", "-c", v.params.cmd] : [rawShell, "-c", v.params.cmd];
        const { stdout } = await execFilePromise("/usr/bin/env", shellArgs);
        // eslint-disable-next-line no-control-regex
        return (
          stdout
            // eslint-disable-next-line no-control-regex
            .replace(/\x1b\[[0-9;]*[ -/]*[@-~]/g, "")
            // eslint-disable-next-line no-control-regex
            .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
            // eslint-disable-next-line no-control-regex
            .replace(/\x1b[@-_]/g, "")
            .trim()
        );
      } catch {
        return `{{${v.name}}}`;
      }
    }
    case "script": {
      const args = v.params?.args;
      if (!args?.length) return `{{${v.name}}}`;
      try {
        const { stdout } = await execFilePromise(args[0], args.slice(1));
        return stdout.trim();
      } catch {
        return `{{${v.name}}}`;
      }
    }
    case "echo":
      return v.params?.echo ?? `{{${v.name}}}`;
    case "random": {
      const values = v.params?.values;
      if (!values?.length) return `{{${v.name}}}`;
      return values[Math.floor(Math.random() * values.length)];
    }
    case "clipboard":
      return (await Clipboard.readText()) ?? `{{${v.name}}}`;
    default:
      return `{{${v.name}}}`;
  }
};

export const expandMatch = async (replace: string | undefined, vars: EspansoVar[] | undefined): Promise<string> => {
  if (!replace) return replace ?? "";
  if (!vars?.length) return replace;
  let result = replace;
  for (const v of vars) {
    const value = await evaluateVar(v);
    result = result.replace(new RegExp(`\\{\\{${escapeRegex(v.name)}\\}\\}`, "g"), value);
  }
  return result;
};

export const resolveImagePath = (imagePath: string, configDir: string): string => {
  const withConfig = imagePath.replace(/\$CONFIG/g, configDir);
  const withHome = withConfig.startsWith("~") ? withConfig.replace("~", process.env.HOME ?? "") : withConfig;
  return path.resolve(withHome);
};
