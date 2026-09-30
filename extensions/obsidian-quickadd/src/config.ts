import { existsSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { basename, join } from "path";
import { parseFields } from "./parse";
import { Choice } from "./types";

export const DEFAULT_OBSIDIAN_JSON = join(homedir(), "Library/Application Support/obsidian/obsidian.json");
export const QUICKADD_DATA = ".obsidian/plugins/quickadd/data.json";
export const OBSIDIAN_PROMPTS_NOTE = "Some prompts will appear in Obsidian.";

export class ConfigError extends Error {}

export function findQuickAddVaults(obsidianJsonPath = DEFAULT_OBSIDIAN_JSON): string[] {
  let registry: { vaults?: Record<string, { path?: unknown }> };
  try {
    registry = JSON.parse(readFileSync(obsidianJsonPath, "utf8"));
  } catch {
    return [];
  }
  return Object.values(registry.vaults ?? {})
    .map((vault) => vault.path)
    .filter((path): path is string => typeof path === "string" && existsSync(join(path, QUICKADD_DATA)));
}

/** Every vault registered with Obsidian, QuickAdd or not. */
export function registeredVaultPaths(obsidianJsonPath = DEFAULT_OBSIDIAN_JSON): string[] {
  try {
    const registry = JSON.parse(readFileSync(obsidianJsonPath, "utf8")) as {
      vaults?: Record<string, { path?: unknown }>;
    };
    return Object.values(registry.vaults ?? {})
      .map((vault) => vault.path)
      .filter((path): path is string => typeof path === "string")
      .map((path) => path.replace(/\/+$/, ""));
  } catch {
    return [];
  }
}

/** Obsidian's URIs and CLI address vaults by folder name, so two vaults with the same name are ambiguous. */
export function isAmbiguousVault(vaultPath: string, registered: string[]): boolean {
  const name = vaultName(vaultPath);
  const self = vaultPath.replace(/\/+$/, "");
  return registered.some((path) => path !== self && vaultName(path) === name);
}

export function vaultName(vaultPath: string): string {
  return basename(vaultPath.replace(/\/+$/, ""));
}

export function loadChoices(vaultPath: string): Choice[] {
  const dataPath = join(vaultPath, QUICKADD_DATA);
  if (!existsSync(dataPath)) {
    throw new ConfigError(`QuickAdd settings not found at ${dataPath}. Is QuickAdd installed in this vault?`);
  }
  let data: { choices?: unknown };
  try {
    data = JSON.parse(readFileSync(dataPath, "utf8"));
  } catch (error) {
    throw new ConfigError(`Could not read QuickAdd settings (${dataPath}): ${(error as Error).message}`);
  }
  if (!Array.isArray(data.choices)) throw new ConfigError(`QuickAdd settings have no choices list (${dataPath}).`);

  const choices: Choice[] = [];
  flatten(data.choices, undefined, vaultPath, choices);
  noteDuplicateNames(choices);
  return choices;
}

interface RawChoice {
  id?: unknown;
  name?: unknown;
  type?: unknown;
  choices?: unknown;
  format?: { enabled?: unknown; format?: unknown };
  captureTo?: unknown;
  captureToActiveFile?: unknown;
  createFileIfItDoesntExist?: { enabled?: unknown; createWithTemplate?: unknown };
  fileNameFormat?: { enabled?: unknown; format?: unknown };
  templatePath?: unknown;
  folder?: { enabled?: unknown; folders?: unknown; chooseWhenCreatingNote?: unknown; chooseFromSubfolders?: unknown };
  openFile?: unknown;
}

const str = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

function flatten(raws: unknown[], parentTitle: string | undefined, vaultPath: string, out: Choice[]) {
  for (const raw of raws as RawChoice[]) {
    if (typeof raw?.id !== "string" || typeof raw.name !== "string") continue;
    const title = parentTitle ? `${parentTitle} › ${raw.name}` : raw.name;
    if (raw.type === "Multi") {
      flatten(Array.isArray(raw.choices) ? raw.choices : [], title, vaultPath, out);
      continue;
    }
    try {
      out.push(buildChoice(raw as RawChoice & { id: string; name: string }, title, vaultPath));
    } catch (error) {
      out.push({
        id: raw.id,
        name: raw.name,
        title,
        type: str(raw.type) ?? "Unknown",
        fields: [],
        notes: [`Could not read this choice's settings: ${(error as Error).message}`, OBSIDIAN_PROMPTS_NOTE],
        openFile: false,
        promptsInObsidian: true,
      });
    }
  }
}

function buildChoice(raw: RawChoice & { id: string; name: string }, title: string, vaultPath: string): Choice {
  const type = str(raw.type) ?? "Unknown";
  const texts: string[] = [];
  const notes: string[] = [];
  let obsidianPrompts = false;
  let fileNameFromValue = false;

  if (type === "Capture") {
    const format = raw.format?.enabled === true ? str(raw.format.format) : undefined;
    texts.push(format || "{{value}}");
    if (raw.captureToActiveFile !== true) {
      const target = str(raw.captureTo)?.trim() ?? "";
      if (target) texts.push(target);
      if (captureTargetPicks(vaultPath, target)) obsidianPrompts = true;
    }
    const create = raw.createFileIfItDoesntExist;
    if (create?.enabled === true && create.createWithTemplate === true) obsidianPrompts = true;
  } else if (type === "Template") {
    const format = raw.fileNameFormat?.enabled === true ? str(raw.fileNameFormat.format) : undefined;
    if (format) {
      texts.push(format);
    } else {
      texts.push("{{value}}");
      fileNameFromValue = true;
    }
    const templatePath = str(raw.templatePath);
    if (templatePath) {
      const body = readTemplate(vaultPath, templatePath);
      if (body === undefined) {
        notes.push(`Template file not found: ${templatePath}. Only the file name fields are asked here.`);
      } else {
        texts.push(body);
      }
    }
    const folder = raw.folder;
    if (folder?.enabled === true) {
      const folders = Array.isArray(folder.folders) ? folder.folders : [];
      if (folder.chooseWhenCreatingNote === true || folder.chooseFromSubfolders === true || folders.length !== 1) {
        obsidianPrompts = true;
      }
    }
  } else {
    obsidianPrompts = true;
  }

  const parsed =
    type === "Capture" || type === "Template" ? parseFields(texts) : { fields: [], hasObsidianPrompts: false };
  if (fileNameFromValue) {
    const valueField = parsed.fields.find((field) => field.key === "value");
    if (valueField) valueField.label = "File name";
  }
  const promptsInObsidian = obsidianPrompts || parsed.hasObsidianPrompts;
  if (promptsInObsidian) notes.push(OBSIDIAN_PROMPTS_NOTE);

  return {
    id: raw.id,
    name: raw.name,
    title,
    type,
    fields: parsed.fields,
    notes,
    openFile: raw.openFile === true,
    promptsInObsidian,
  };
}

/** QuickAdd shows a file picker for empty, #tag, property:, folder/ and existing-folder targets. */
function captureTargetPicks(vaultPath: string, target: string): boolean {
  if (target === "") return true;
  if (target.startsWith("#") || target.endsWith("/") || /^property:/i.test(target)) return true;
  if (target.includes("{{")) return false;
  return isDirectory(join(vaultPath, target));
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function readTemplate(vaultPath: string, templatePath: string): string | undefined {
  for (const candidate of [templatePath, `${templatePath}.md`]) {
    const full = join(vaultPath, candidate);
    if (isFile(full)) return readFileSync(full, "utf8");
  }
  return undefined;
}

function noteDuplicateNames(choices: Choice[]) {
  const counts = new Map<string, number>();
  for (const choice of choices) counts.set(choice.name, (counts.get(choice.name) ?? 0) + 1);
  for (const choice of choices) {
    if ((counts.get(choice.name) ?? 0) > 1) {
      choice.notes.push(
        `Another choice is also named "${choice.name}". QuickAdd runs choices by name, so it may run the other one.`,
      );
    }
  }
}
