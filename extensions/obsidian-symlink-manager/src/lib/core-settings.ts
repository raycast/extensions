import { randomUUID, createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";
import { environment } from "@raycast/api";
import { commitItem } from "./git";
import { detachItem, scanItems } from "./items";
import { parseHotkeyBindings, type HotkeyBinding } from "./hotkey-display";

/** The only settings files permitted by 01_Configuration_Mapping.md. Keys are discovered from the vaults. */
export const SETTING_FILES = [
  { name: "app.json", title: "Editor" },
  { name: "appearance.json", title: "Appearance" },
  { name: "hotkeys.json", title: "Hotkeys" },
  { name: "community-plugins.json", title: "Community Plugins" },
  { name: "core-plugins.json", title: "Core Plugins" },
] as const;

export type SettingFile = (typeof SETTING_FILES)[number]["name"];
export const LINKABLE_SETTINGS_GROUPS = [
  { file: "app.json", title: "Editor" },
  { file: "appearance.json", title: "Appearance" },
  { file: "hotkeys.json", title: "Hotkeys" },
] as const;
export type LinkableSettingsGroup = (typeof LINKABLE_SETTINGS_GROUPS)[number]["file"];
export function isLinkableSettingsGroup(file: string): file is LinkableSettingsGroup {
  return file === "app.json" || file === "appearance.json" || file === "hotkeys.json";
}
export type SettingKind = "key" | "entry";
export interface SettingChoice {
  id: string;
  file: SettingFile;
  kind: SettingKind;
  name: string;
  label: string;
  title: string;
  defaultValue: string;
  targetValue: string;
  defaultHotkeys?: HotkeyBinding[] | null;
  targetHotkeys?: HotkeyBinding[] | null;
  inDefault: boolean;
  inTarget: boolean;
  defaultFileExists: boolean;
  targetFileExists: boolean;
  different: boolean;
  defaultHash: string;
  targetHash: string;
}
export interface SettingProblem {
  file: SettingFile;
  title: string;
  message: string;
}

export type ActivationEntry = Pick<
  SettingChoice,
  "name" | "defaultValue" | "targetValue" | "inDefault" | "inTarget" | "different"
>;

export interface MirrorSettingsPlan {
  ids: string[];
  removed: number;
  expected: Record<string, { defaultHash: string; targetHash: string }>;
  problems: SettingProblem[];
}

const MIRRORED_FILES: readonly SettingFile[] = ["app.json", "appearance.json", "hotkeys.json"];
export function isLocalActivation(file: SettingFile, name: string): boolean {
  return (
    file === "community-plugins.json" ||
    file === "core-plugins.json" ||
    (file === "appearance.json" && name === "enabledCssSnippets")
  );
}

export function mirrorPlanFromScan(
  scan: { choices: SettingChoice[]; problems: SettingProblem[] },
  linkedGroups: readonly LinkableSettingsGroup[] = [],
  files: readonly LinkableSettingsGroup[] = LINKABLE_SETTINGS_GROUPS.map(({ file }) => file),
): MirrorSettingsPlan {
  const selected = scan.choices.filter(
    (choice) =>
      files.includes(choice.file as LinkableSettingsGroup) &&
      !linkedGroups.includes(choice.file as LinkableSettingsGroup) &&
      !isLocalActivation(choice.file, choice.name) &&
      choice.defaultFileExists &&
      choice.different,
  );
  const expected: MirrorSettingsPlan["expected"] = {};
  for (const choice of selected) {
    expected[choice.file] = { defaultHash: choice.defaultHash, targetHash: choice.targetHash };
  }
  return {
    ids: selected.map((choice) => choice.id),
    removed: selected.filter((choice) => !choice.inDefault && choice.inTarget).length,
    expected,
    problems: scan.problems.filter(
      (problem) =>
        files.includes(problem.file as LinkableSettingsGroup) &&
        !linkedGroups.includes(problem.file as LinkableSettingsGroup),
    ),
  };
}

export async function mirrorSettings(
  defaultVault: string,
  targetVault: string,
  files?: readonly LinkableSettingsGroup[],
): Promise<{ changed: number; backups: string[]; detached: number }> {
  if (files?.length === 0) return { changed: 0, backups: [], detached: 0 };
  const selectedFiles = files ?? LINKABLE_SETTINGS_GROUPS.map(({ file }) => file);
  const items = await scanItems(defaultVault, targetVault);
  const linked = items.filter((item) => item.category === "settings" && item.state === "linked");
  const linkedGroups = linked
    .filter((item) => isLinkableSettingsGroup(item.name))
    .map((item) => item.name as LinkableSettingsGroup);
  const toDetach = files
    ? linked.filter((item) => selectedFiles.includes(item.name as LinkableSettingsGroup))
    : linked.filter((item) => !isLinkableSettingsGroup(item.name));
  const unsafe = items.filter(
    (item) =>
      item.category === "settings" &&
      (!files || selectedFiles.includes(item.name as LinkableSettingsGroup)) &&
      (item.state === "broken" || item.state === "foreign-link"),
  );
  if (unsafe.length)
    throw new Error(
      `Cannot mirror settings while ${unsafe.map((item) => item.name).join(", ")} has an unsafe link. Review it in Core Settings.`,
    );
  const canonicalDefault = await physicalVault(defaultVault);
  await Promise.all(selectedFiles.map((file) => readSettings(canonicalDefault, file)));
  const linkedNames = new Set(linked.map((item) => item.name));
  const preliminary = mirrorPlanFromScan(
    await scanSettingChoices(defaultVault, targetVault),
    linkedGroups,
    selectedFiles,
  );
  const blocking = preliminary.problems.filter((problem) => !linkedNames.has(problem.file));
  if (blocking.length)
    throw new Error(`Cannot mirror ${blocking.map((problem) => problem.file).join(", ")}. Review it in Core Settings.`);
  for (const item of toDetach) await detachItem(item);
  const plan = mirrorPlanFromScan(
    await scanSettingChoices(defaultVault, targetVault),
    linkedGroups.filter((file) => !selectedFiles.includes(file) || !files),
    selectedFiles,
  );
  if (plan.problems.length)
    throw new Error(
      `Cannot mirror ${plan.problems.map((problem) => problem.file).join(", ")}. Open Core Settings to review.`,
    );
  const result = await syncSettingChoices(defaultVault, targetVault, plan.ids, "default", plan.expected);
  return { changed: result.changed, backups: result.backups, detached: toDetach.length };
}

type SettingsValue = Record<string, unknown> | string[];

function isSettingFile(name: string): name is SettingFile {
  return SETTING_FILES.some((file) => file.name === name);
}

export function settingChoiceId(file: SettingFile, kind: SettingKind, name: string): string {
  return `settings/${file}/${kind}/${encodeURIComponent(name)}`;
}

export function parseSettingChoiceId(id: string): { file: SettingFile; kind: SettingKind; name: string } | null {
  const match = /^settings\/([^/]+)\/(key|entry)\/([^/]+)$/.exec(id);
  if (!match || !isSettingFile(match[1])) return null;
  try {
    const name = decodeURIComponent(match[3]);
    const kind = match[2] as SettingKind;
    if (!name || settingChoiceId(match[1], kind, name) !== id) return null;
    if ((match[1].includes("plugins") ? "entry" : "key") !== kind) return null;
    return { file: match[1], kind, name };
  } catch {
    return null;
  }
}

/** Existing profiles selected whole setting files. Convert those selections to the keys currently in the source. */
export function expandLegacySettings(ids: string[], availableIds: string[]): string[] {
  const expanded = ids.flatMap((id) => {
    const file = id.startsWith("settings/") ? id.slice("settings/".length) : "";
    if (!isSettingFile(file)) return [id];
    return availableIds.filter((candidate) => candidate.startsWith(`settings/${file}/`));
  });
  return [...new Set(expanded)];
}

function preview(value: unknown, present: boolean): string {
  if (!present) return "Absent";
  const json = JSON.stringify(value);
  if (json === undefined) return "Absent";
  return json.length > 120 ? `${json.slice(0, 117)}…` : json;
}

function settingLabel(file: SettingFile, name: string): string {
  if (file === "hotkeys.json" || file.endsWith("plugins.json")) return name;
  const words = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

async function physicalVault(vault: string): Promise<string> {
  if (!path.isAbsolute(vault)) throw new Error("Vault path must be absolute.");
  const root = await fs.realpath(vault);
  const stat = await fs.lstat(path.join(root, ".obsidian"));
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Vault needs a physical .obsidian directory.");
  return root;
}

async function readSettings(
  vault: string,
  file: SettingFile,
): Promise<{ value: SettingsValue | null; text: string | null; mode?: number }> {
  const pathname = path.join(vault, ".obsidian", file);
  let stat: Awaited<ReturnType<typeof fs.lstat>>;
  try {
    stat = await fs.lstat(pathname);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { value: null, text: null };
    throw error;
  }
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error(`${file} must be a physical JSON file in ${vault}. Detach it first.`);
  const text = await fs.readFile(pathname, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${file} contains invalid JSON in ${vault}.`);
  }
  const stringArray = Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string");
  const object = parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
  const valid =
    file === "community-plugins.json"
      ? stringArray
      : file === "core-plugins.json"
        ? stringArray ||
          (object && Object.values(parsed as Record<string, unknown>).every((entry) => typeof entry === "boolean"))
        : object;
  if (!valid) {
    throw new Error(`${file} has an unexpected JSON structure in ${vault}.`);
  }
  return { value: parsed as SettingsValue, text, mode: stat.mode };
}

/** Link a whole settings group whose file contains no local activation choices. */
export async function linkSettingsGroup(
  defaultVaultPath: string,
  targetVaultPath: string,
  file: LinkableSettingsGroup,
  confirmed = false,
): Promise<{ changed: boolean; backup: string | null }> {
  if (!isLinkableSettingsGroup(file)) throw new Error("This settings file cannot use a live link.");
  const [defaultVault, targetVault] = await Promise.all([
    physicalVault(defaultVaultPath),
    physicalVault(targetVaultPath),
  ]);
  if (defaultVault === targetVault) throw new Error("Default and target vault must differ.");
  const sourcePath = path.join(defaultVault, ".obsidian", file);
  const targetPath = path.join(targetVault, ".obsidian", file);
  if (!(await readSettings(defaultVault, file)).value) throw new Error(`The Default Vault has no ${file} to link.`);
  let targetStat: Awaited<ReturnType<typeof fs.lstat>> | null;
  try {
    targetStat = await fs.lstat(targetPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    targetStat = null;
  }
  if (targetStat?.isSymbolicLink()) {
    const destination = path.resolve(path.dirname(targetPath), await fs.readlink(targetPath));
    if (destination === sourcePath) return { changed: false, backup: null };
    throw new Error(`${file} points to another location. Review that link before replacing it.`);
  }
  if (targetStat && !targetStat.isFile()) throw new Error(`${file} is not a regular file in the Target Vault.`);
  if (targetStat && !confirmed) throw new Error(`Replacing a local ${file} requires confirmation.`);
  const existing = targetStat ? await readSettings(targetVault, file) : null;
  if (targetStat && !existing?.value) throw new Error(`${file} changed. Refresh and try again.`);
  const backup = existing
    ? path.join(environment.supportPath, "settings-backups", `${file}-${Date.now()}-${randomUUID()}.backup`)
    : null;
  if (backup && existing) {
    await fs.mkdir(path.dirname(backup), { recursive: true });
    await fs.writeFile(backup, existing.text!, { flag: "wx", mode: existing.mode });
  }
  if (!targetStat) {
    await fs.symlink(sourcePath, targetPath, "file");
    return { changed: true, backup: null };
  }
  const staged = path.join(targetVault, ".obsidian", `.obsidian-symlink-manager-${randomUUID()}.tmp`);
  const latest = await readSettings(targetVault, file);
  if (digest(latest.text) !== digest(existing!.text)) throw new Error(`${file} changed. Refresh and try again.`);
  await fs.rename(targetPath, staged);
  try {
    await fs.symlink(sourcePath, targetPath, "file");
  } catch (error) {
    if (!(await fs.lstat(targetPath).catch(() => null))) await fs.rename(staged, targetPath);
    throw error;
  }
  const stagedStat = await fs.lstat(staged);
  if (!stagedStat.isFile() || stagedStat.isSymbolicLink())
    throw new Error(`Unexpected staged file type for ${file}. The backup remains at ${backup}.`);
  await fs.rm(staged);
  return { changed: true, backup };
}

function units(value: SettingsValue | null): string[] {
  return value ? (Array.isArray(value) ? value : Object.keys(value)) : [];
}

function has(value: SettingsValue | null, name: string): boolean {
  return value ? (Array.isArray(value) ? value.includes(name) : Object.hasOwn(value, name)) : false;
}

function at(value: SettingsValue | null, name: string): unknown {
  return value && !Array.isArray(value) ? value[name] : true;
}

function choiceValue(file: SettingFile, value: SettingsValue | null, name: string): string {
  if (file === "community-plugins.json") return has(value, name) ? "Enabled" : "Disabled";
  if (file === "core-plugins.json") {
    if (Array.isArray(value)) return value.includes(name) ? "Enabled" : "Disabled";
    if (!has(value, name)) return "Not configured";
    return at(value, name) === true ? "Enabled" : "Disabled";
  }
  return preview(at(value, name), has(value, name));
}

export async function scanSettingChoices(
  defaultVaultPath: string,
  targetVaultPath?: string,
): Promise<{ choices: SettingChoice[]; problems: SettingProblem[] }> {
  const defaultVault = await physicalVault(defaultVaultPath);
  const targetVault = targetVaultPath ? await physicalVault(targetVaultPath) : null;
  if (targetVault && targetVault === defaultVault) throw new Error("Default and target vault must differ.");
  const results = await Promise.all(
    SETTING_FILES.map(async ({ name: file, title }) => {
      try {
        const [source, target] = await Promise.all([
          readSettings(defaultVault, file),
          targetVault
            ? readSettings(targetVault, file)
            : Promise.resolve({ value: null, text: null } as Awaited<ReturnType<typeof readSettings>>),
        ]);
        const kind: SettingKind = file.includes("plugins") ? "entry" : "key";
        const choices = [...new Set([...units(source.value), ...units(target.value)])]
          .sort((a, b) => a.localeCompare(b))
          .map((name) => {
            const inDefault = has(source.value, name);
            const inTarget = has(target.value, name);
            return {
              id: settingChoiceId(file, kind, name),
              file,
              kind,
              name,
              label: settingLabel(file, name),
              title,
              defaultValue: choiceValue(file, source.value, name),
              targetValue: choiceValue(file, target.value, name),
              defaultHotkeys:
                file === "hotkeys.json" && inDefault ? parseHotkeyBindings(at(source.value, name)) : undefined,
              targetHotkeys:
                file === "hotkeys.json" && inTarget ? parseHotkeyBindings(at(target.value, name)) : undefined,
              inDefault,
              inTarget,
              defaultFileExists: source.value !== null,
              targetFileExists: target.value !== null,
              defaultHash: digest(source.text),
              targetHash: digest(target.text),
              different:
                inDefault !== inTarget ||
                (inDefault &&
                  inTarget &&
                  JSON.stringify(at(source.value, name)) !== JSON.stringify(at(target.value, name))),
            };
          });
        return { choices, problem: null };
      } catch (error) {
        return { choices: [] as SettingChoice[], problem: { file, title, message: String(error) } };
      }
    }),
  );
  return {
    choices: results.flatMap((result) => result.choices),
    problems: results.flatMap((result) => (result.problem ? [result.problem] : [])),
  };
}

/** Read the known local activation key without treating each snippet as a writable settings choice. */
export async function scanEnabledCssSnippets(
  defaultVaultPath: string,
  targetVaultPath: string,
  appearanceLinked = false,
): Promise<ActivationEntry[]> {
  const [defaultVault, targetVault] = await Promise.all([
    physicalVault(defaultVaultPath),
    physicalVault(targetVaultPath),
  ]);
  if (defaultVault === targetVault) throw new Error("Default and target vault must differ.");
  const source = await readSettings(defaultVault, "appearance.json");
  const target = appearanceLinked ? source : await readSettings(targetVault, "appearance.json");
  const names = (value: SettingsValue | null): string[] => {
    if (value === null) return [];
    const enabled = (value as Record<string, unknown>).enabledCssSnippets;
    if (enabled === undefined) return [];
    if (!Array.isArray(enabled) || !enabled.every((name) => typeof name === "string")) {
      throw new Error("appearance.json has an invalid enabledCssSnippets list.");
    }
    return enabled;
  };
  const defaultNames = new Set(names(source.value));
  const targetNames = new Set(names(target.value));
  return [...new Set([...defaultNames, ...targetNames])]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const inDefault = defaultNames.has(name);
      const inTarget = targetNames.has(name);
      return {
        name,
        defaultValue: inDefault ? "Enabled" : "Disabled",
        targetValue: inTarget ? "Enabled" : "Disabled",
        inDefault,
        inTarget,
        different: inDefault !== inTarget,
      };
    });
}

export async function listSettingChoices(defaultVaultPath: string, targetVaultPath?: string): Promise<SettingChoice[]> {
  return (await scanSettingChoices(defaultVaultPath, targetVaultPath)).choices;
}

/** Remove one local key so Obsidian can use its own default for that setting. */
export async function removeTargetSetting(
  defaultVaultPath: string,
  targetVaultPath: string,
  choice: SettingChoice,
): Promise<string> {
  if (choice.kind !== "key" || !MIRRORED_FILES.includes(choice.file) || isLocalActivation(choice.file, choice.name))
    throw new Error("This setting cannot be removed here.");
  const [defaultVault, targetVault] = await Promise.all([
    physicalVault(defaultVaultPath),
    physicalVault(targetVaultPath),
  ]);
  if (defaultVault === targetVault) throw new Error("Default and target vault must differ.");
  const [origin, target] = await Promise.all([
    readSettings(defaultVault, choice.file),
    readSettings(targetVault, choice.file),
  ]);
  if (digest(origin.text) !== choice.defaultHash || digest(target.text) !== choice.targetHash)
    throw new Error(`${choice.file} changed since it was reviewed. Refresh and try again.`);
  if (!target.value || Array.isArray(target.value) || !Object.hasOwn(target.value, choice.name))
    throw new Error("This vault no longer has that setting.");
  const next = clone(target.value, target.value) as Record<string, unknown>;
  delete next[choice.name];
  const backupFolder = path.join(environment.supportPath, "settings-backups");
  const backup = path.join(backupFolder, `${choice.file}-${Date.now()}-${randomUUID()}.backup`);
  await fs.mkdir(backupFolder, { recursive: true });
  await fs.writeFile(backup, target.text!, { flag: "wx", mode: target.mode });
  const pathname = path.join(targetVault, ".obsidian", choice.file);
  const temp = path.join(targetVault, ".obsidian", `.obsidian-symlink-manager-${randomUUID()}.tmp`);
  const indent = target.text?.match(/\n([ \t]+)\S/)?.[1] ?? "  ";
  const nextText = `${JSON.stringify(next, null, indent)}${target.text?.endsWith("\n") === false ? "" : "\n"}`;
  await fs.writeFile(temp, nextText, { flag: "wx", mode: target.mode });
  try {
    const latest = await readSettings(targetVault, choice.file);
    if (digest(latest.text) !== digest(target.text))
      throw new Error(`${choice.file} changed during removal. Refresh and try again.`);
    await fs.rename(temp, pathname);
  } catch (error) {
    await fs.rm(temp, { force: true });
    throw error;
  }
  return backup;
}

function clone(value: SettingsValue | null, source: SettingsValue): SettingsValue {
  return value === null ? (Array.isArray(source) ? [] : {}) : (JSON.parse(JSON.stringify(value)) as SettingsValue);
}

function applyUnit(destination: SettingsValue, source: SettingsValue, name: string, file: SettingFile): void {
  if (Array.isArray(destination)) {
    const index = destination.indexOf(name);
    const enabled = file === "core-plugins.json" && !Array.isArray(source) ? source[name] === true : has(source, name);
    if (enabled && index < 0) destination.push(name);
    if (!enabled && index >= 0) destination.splice(index, 1);
  } else if (has(source, name)) {
    Object.defineProperty(destination, name, {
      value: file === "core-plugins.json" && Array.isArray(source) ? true : at(source, name),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  } else if (file === "core-plugins.json" && Array.isArray(source)) {
    Object.defineProperty(destination, name, { value: false, enumerable: true, writable: true, configurable: true });
  } else {
    delete destination[name];
  }
}

function digest(text: string | null): string {
  return createHash("sha256")
    .update(text ?? "<absent>")
    .digest("hex");
}

/** Merge selected keys or plugin IDs into a local file. Unselected values are preserved. */
export async function syncSettingChoices(
  defaultVaultPath: string,
  targetVaultPath: string,
  ids: string[],
  from: "default" | "target" = "default",
  expected?: Record<string, { defaultHash: string; targetHash: string }>,
): Promise<{ changed: number; backups: string[]; historyWarnings: string[] }> {
  const [defaultVault, targetVault] = await Promise.all([
    physicalVault(defaultVaultPath),
    physicalVault(targetVaultPath),
  ]);
  if (defaultVault === targetVault) throw new Error("Default and target vault must differ.");
  const parsed = ids.map((id) => parseSettingChoiceId(id));
  if (parsed.some((part) => !part)) throw new Error("A setting is outside the approved paths.");
  const grouped = new Map<SettingFile, Set<string>>();
  for (const part of parsed) {
    const selected = part!;
    grouped.set(selected.file, (grouped.get(selected.file) ?? new Set()).add(selected.name));
  }
  const backups: string[] = [];
  const historyWarnings: string[] = [];
  let changed = 0;
  for (const [file, names] of grouped) {
    const [origin, target] = await Promise.all([readSettings(defaultVault, file), readSettings(targetVault, file)]);
    if (
      expected?.[file] &&
      (digest(origin.text) !== expected[file].defaultHash || digest(target.text) !== expected[file].targetHash)
    ) {
      throw new Error(`${file} changed since it was reviewed. Refresh and review it again.`);
    }
    const source = from === "default" ? origin : target;
    const destination = from === "default" ? target : origin;
    if (!source.value) throw new Error(`Source ${file} is missing.`);
    const next = clone(destination.value, source.value);
    for (const name of names) {
      const before = JSON.stringify(next);
      applyUnit(next, source.value, name, file);
      if (JSON.stringify(next) !== before) changed++;
    }
    if (JSON.stringify(next) === JSON.stringify(destination.value)) continue;
    const destinationVault = from === "default" ? targetVault : defaultVault;
    const pathname = path.join(destinationVault, ".obsidian", file);
    if (from === "target" && destination.value !== null) {
      await commitItem(defaultVault, file, `Snapshot ${file} before selective settings sync`);
    }
    const indent = destination.text?.match(/\n([ \t]+)\S/)?.[1] ?? "  ";
    const nextText = `${JSON.stringify(next, null, indent)}${destination.text?.endsWith("\n") === false ? "" : "\n"}`;
    const backupFolder = path.join(environment.supportPath, "settings-backups");
    const backup =
      destination.text === null ? null : path.join(backupFolder, `${file}-${Date.now()}-${randomUUID()}.backup`);
    if (backup) {
      await fs.mkdir(backupFolder, { recursive: true });
      await fs.writeFile(backup, destination.text!, { flag: "wx", mode: destination.mode });
      backups.push(backup);
    }
    const temp = path.join(destinationVault, ".obsidian", `.obsidian-symlink-manager-${randomUUID()}.tmp`);
    await fs.writeFile(temp, nextText, { flag: "wx", mode: destination.mode });
    try {
      const latest = await readSettings(destinationVault, file);
      if (digest(latest.text) !== digest(destination.text))
        throw new Error(`${file} changed during sync. Retry after refreshing.`);
      await fs.rename(temp, pathname);
    } catch (error) {
      await fs.rm(temp, { force: true });
      throw error;
    }
    if (from === "target") {
      try {
        await commitItem(defaultVault, file, `Synced selected ${file} settings from ${path.basename(targetVault)}`);
      } catch (error) {
        historyWarnings.push(`${file} changed, but Git could not record it: ${String(error)}`);
      }
    }
  }
  return { changed, backups, historyWarnings };
}

/** Activate explicitly selected linked components while preserving other local choices. */
export async function enableTargetComponents(
  defaultVaultPath: string,
  targetVaultPath: string,
  plugins: string[],
  snippets: string[],
): Promise<number> {
  if (!plugins.length && !snippets.length) return 0;
  const [defaultVault, targetVault] = await Promise.all([
    physicalVault(defaultVaultPath),
    physicalVault(targetVaultPath),
  ]);
  if (defaultVault === targetVault) throw new Error("Default and target vault must differ.");
  let changed = 0;
  for (const [file, names] of [
    ["community-plugins.json", plugins],
    ["appearance.json", snippets],
  ] as const) {
    if (!names.length) continue;
    const current = await readSettings(targetVault, file);
    const next =
      file === "community-plugins.json"
        ? [...new Set([...((current.value as string[] | null) ?? []), ...names])]
        : {
            ...((current.value as Record<string, unknown> | null) ?? {}),
            enabledCssSnippets: [
              ...new Set([
                ...(((current.value as Record<string, unknown> | null)?.enabledCssSnippets as string[] | undefined) ??
                  []),
                ...names,
              ]),
            ],
          };
    if (file === "appearance.json") {
      const existing = (current.value as Record<string, unknown> | null)?.enabledCssSnippets;
      if (existing !== undefined && (!Array.isArray(existing) || !existing.every((name) => typeof name === "string")))
        throw new Error("appearance.json has an invalid enabledCssSnippets list.");
    }
    const before =
      file === "community-plugins.json"
        ? ((current.value as string[] | null) ?? [])
        : (((current.value as Record<string, unknown> | null)?.enabledCssSnippets as string[] | undefined) ?? []);
    changed += names.filter((name) => !before.includes(name)).length;
    if (JSON.stringify(next) === JSON.stringify(current.value)) continue;
    const pathname = path.join(targetVault, ".obsidian", file);
    const backupFolder = path.join(environment.supportPath, "settings-backups");
    if (current.text !== null) {
      await fs.mkdir(backupFolder, { recursive: true });
      await fs.writeFile(path.join(backupFolder, `${file}-${Date.now()}-${randomUUID()}.backup`), current.text, {
        flag: "wx",
        mode: current.mode,
      });
    }
    const temp = path.join(targetVault, ".obsidian", `.obsidian-symlink-manager-${randomUUID()}.tmp`);
    await fs.writeFile(temp, `${JSON.stringify(next, null, 2)}\n`, { flag: "wx", mode: current.mode });
    try {
      const latest = await readSettings(targetVault, file);
      if (digest(latest.text) !== digest(current.text)) throw new Error(`${file} changed during activation. Retry.`);
      await fs.rename(temp, pathname);
    } catch (error) {
      await fs.rm(temp, { force: true });
      throw error;
    }
  }
  return changed;
}
