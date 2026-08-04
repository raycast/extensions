import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
export type SkillProvider = "codex" | "claude";
export type SkillScope = "user" | "project" | "plugin" | "system" | "admin";
export type ClaudeSettingsScope = "user" | "project";

export interface ManagedSkill {
  id: string;
  provider: SkillProvider;
  name: string;
  description: string;
  scope: SkillScope;
  enabled: boolean;
  origin: string;
  path: string;
  directory: string;
  invocation: string;
  canToggle: boolean;
  statusReason?: string;
  overrideKey?: string;
  pluginId?: string;
}

export interface SkillInventoryWarning {
  provider: SkillProvider;
  message: string;
  path?: string;
}

export interface SkillInventory {
  skills: ManagedSkill[];
  warnings: SkillInventoryWarning[];
  codexSource: "app-server" | "filesystem";
}

interface CodexAppServerSkill {
  name: string;
  description: string;
  path: string;
  scope: "user" | "repo" | "system" | "admin";
  enabled: boolean;
  shortDescription?: string;
  interface?: {
    displayName?: string | null;
    shortDescription?: string | null;
  } | null;
}

interface CodexSkillsListEntry {
  cwd: string;
  skills: CodexAppServerSkill[];
  errors: Array<{ message: string; path: string }>;
}

interface CodexSkillsListResponse {
  data: CodexSkillsListEntry[];
}

interface CodexSkillsConfigWriteResponse {
  effectiveEnabled: boolean;
}

type ClaudeSkillOverride = "on" | "name-only" | "user-invocable-only" | "off";

interface ClaudeSettingsLayer {
  path: string;
  managed: boolean;
  skillOverrides: Record<string, ClaudeSkillOverride>;
  enabledPlugins: Record<string, boolean>;
}

interface ClaudeSettingsState {
  layers: ClaudeSettingsLayer[];
  userPath: string;
  projectPath: string;
}

interface ClaudePluginInstallation {
  scope?: string;
  installPath?: string;
  projectPath?: string;
}

interface SkillFileMetadata {
  name: string;
  description: string;
}

interface ScannedSkillOptions {
  provider: SkillProvider;
  root: string;
  scope: SkillScope;
  origin: string;
  enabledForName?: (name: string) => { enabled: boolean; locked: boolean; reason?: string };
  pluginId?: string;
  pluginEnabled?: boolean;
}

const maximumMetadataBytes = 512 * 1024;
const maximumMarkdownBytes = 1_500_000;
const maximumScanDepth = 7;
const maximumScannedEntries = 5_000;
const appServerTimeoutMilliseconds = 12_000;
const maximumAppServerOutputBytes = 4 * 1_024 * 1_024;

export async function loadSkillInventory(cwd = process.cwd()): Promise<SkillInventory> {
  const projectDirectory = resolve(cwd);
  const warnings: SkillInventoryWarning[] = [];
  let codexSource: SkillInventory["codexSource"] = "app-server";

  const [codexResult, claudeResult] = await Promise.all([
    loadCodexSkills(projectDirectory).catch(async (error: unknown) => {
      codexSource = "filesystem";
      warnings.push({
        provider: "codex",
        message: `The app server did not respond; using the local scan instead: ${errorMessage(error)}`,
      });
      return loadCodexSkillsFromFilesystem(projectDirectory);
    }),
    loadClaudeSkills(projectDirectory),
  ]);

  warnings.push(...codexResult.warnings, ...claudeResult.warnings);
  return {
    skills: deduplicateSkills([...codexResult.skills, ...claudeResult.skills]).sort(compareSkills),
    warnings,
    codexSource,
  };
}

export async function setCodexSkillEnabled(skill: ManagedSkill, enabled: boolean): Promise<boolean> {
  if (skill.provider !== "codex") throw new Error("The selected skill does not belong to Codex.");
  assertSkillCanBeChanged(skill);
  if (!isAbsolute(skill.path)) throw new Error("Codex requires an absolute path to modify the skill.");

  const response = await codexAppServerRequest<CodexSkillsConfigWriteResponse>(
    "skills/config/write",
    { path: skill.path, name: null, enabled },
    dirname(skill.path),
  );
  if (!response || typeof response.effectiveEnabled !== "boolean") {
    throw new Error("Codex returned an invalid response while saving the skill state.");
  }
  return response.effectiveEnabled;
}

export async function setClaudeSkillEnabled(
  skill: ManagedSkill,
  enabled: boolean,
  cwd = process.cwd(),
  settingsScope: ClaudeSettingsScope = "user",
): Promise<string> {
  if (skill.provider !== "claude") throw new Error("The selected skill does not belong to Claude.");
  assertSkillCanBeChanged(skill);
  if (skill.pluginId) throw new Error("Plugin skills are managed through /plugin in Claude.");

  const overrideKey = skill.overrideKey || skill.name;
  if (!overrideKey.trim()) throw new Error("The skill does not have a valid skillOverrides name.");
  if (["__proto__", "constructor", "prototype"].includes(overrideKey)) {
    throw new Error("The skill name is not safe to store in settings.");
  }

  const settingsPath = await claudeSkillSettingsPath(cwd, settingsScope);
  await mergeClaudeSkillOverride(settingsPath, overrideKey, enabled ? "on" : "off");
  return settingsPath;
}

export async function claudeSkillSettingsPath(
  cwd = process.cwd(),
  settingsScope: ClaudeSettingsScope = "project",
): Promise<string> {
  if (settingsScope === "user") return join(homedir(), ".claude", "settings.json");
  const projectDirectories = await findClaudeProjectDirectories(resolve(cwd));
  return join(projectDirectories.at(-1) || resolve(cwd), ".claude", "settings.local.json");
}

export async function readSkillMarkdown(skillPath: string): Promise<string> {
  const stats = await fs.stat(skillPath);
  if (!stats.isFile()) throw new Error("SKILL.md no longer exists or is not a file.");
  if (stats.size <= maximumMarkdownBytes) return fs.readFile(skillPath, "utf8");

  const handle = await fs.open(skillPath, "r");
  try {
    const buffer = Buffer.alloc(maximumMarkdownBytes);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return `${buffer.subarray(0, bytesRead).toString("utf8")}\n\n---\n\n> Truncated preview: the complete file exceeds ${formatBytes(maximumMarkdownBytes)}.`;
  } finally {
    await handle.close();
  }
}

async function loadCodexSkills(cwd: string): Promise<{
  skills: ManagedSkill[];
  warnings: SkillInventoryWarning[];
}> {
  const response = await codexAppServerRequest<CodexSkillsListResponse>(
    "skills/list",
    { cwds: [cwd], forceReload: true },
    cwd,
  );
  if (!isRecord(response) || !Array.isArray(response.data)) {
    throw new Error("skills/list returned an unknown format.");
  }

  const skills: ManagedSkill[] = [];
  const warnings: SkillInventoryWarning[] = [];
  for (const rawEntry of response.data) {
    const entry = parseCodexSkillsListEntry(rawEntry);
    if (!entry) continue;
    for (const error of entry.errors) {
      warnings.push({ provider: "codex", message: error.message, path: error.path });
    }
    for (const codexSkill of entry.skills) {
      const scope = codexScope(codexSkill.scope);
      const skillPath = normalizeSkillFilePath(codexSkill.path);
      const description = compactText(
        codexSkill.interface?.shortDescription || codexSkill.shortDescription || codexSkill.description,
        360,
      );
      skills.push({
        id: `codex:${skillPath}`,
        provider: "codex",
        name: codexSkill.name,
        description: description || "Codex skill without a description.",
        scope,
        enabled: codexSkill.enabled,
        origin: codexOrigin(scope, skillPath),
        path: skillPath,
        directory: dirname(skillPath),
        invocation: `$${codexSkill.name}`,
        canToggle: scope !== "system" && scope !== "admin",
        statusReason: scope === "system" || scope === "admin" ? "Managed skill: shown in read-only mode." : undefined,
      });
    }
  }
  if (skills.length === 0) throw new Error("The app server did not return any skills.");
  return { skills, warnings };
}

async function loadCodexSkillsFromFilesystem(cwd: string): Promise<{
  skills: ManagedSkill[];
  warnings: SkillInventoryWarning[];
}> {
  const overrides = await readCodexSkillOverrides(join(homedir(), ".codex", "config.toml"));
  const roots: ScannedSkillOptions[] = [
    {
      provider: "codex",
      root: join(homedir(), ".codex", "skills"),
      scope: "user",
      origin: `Codex · ${"User"}`,
    },
    {
      provider: "codex",
      root: join(cwd, ".codex", "skills"),
      scope: "project",
      origin: `Codex · ${"Current project"}`,
    },
  ];

  const skills = (
    await Promise.all(
      roots.map((root) =>
        scanSkillRoot({
          ...root,
          enabledForName: (name) => ({
            enabled: codexOverrideEnabled(overrides, name, root.root),
            locked: false,
          }),
        }),
      ),
    )
  ).flat();

  for (const skill of skills) {
    const explicitPath = overrides.paths.get(normalizeComparablePath(skill.path));
    if (typeof explicitPath === "boolean") skill.enabled = explicitPath;
    if (skill.path.includes(`${sep}.system${sep}`)) {
      skill.scope = "system";
      skill.origin = `Codex · ${"System"}`;
      skill.canToggle = false;
      skill.statusReason = "System skill: shown in read-only mode.";
    }
  }
  return { skills, warnings: [] };
}

async function loadClaudeSkills(cwd: string): Promise<{
  skills: ManagedSkill[];
  warnings: SkillInventoryWarning[];
}> {
  const projectDirectories = await findClaudeProjectDirectories(cwd);
  const projectRoot = projectDirectories.at(-1) || cwd;
  const settings = await loadClaudeSettings(projectRoot);
  const regularRoots: ScannedSkillOptions[] = [
    {
      provider: "claude",
      root: join(homedir(), ".claude", "skills"),
      scope: "user",
      origin: `Claude · ${"User"}`,
    },
    ...projectDirectories.map((directory) => ({
      provider: "claude" as const,
      root: join(directory, ".claude", "skills"),
      scope: "project" as const,
      origin:
        directory === projectRoot
          ? `Claude · ${"Project"}`
          : `Claude · Project · ${relative(projectRoot, directory) || basename(directory)}`,
    })),
  ];
  const regularSkills = (
    await Promise.all(
      regularRoots.map((root) =>
        scanSkillRoot({
          ...root,
          enabledForName: (name) => resolveClaudeSkillState(settings.layers, name),
        }),
      ),
    )
  ).flat();
  markShadowedClaudeProjectSkills(regularSkills);

  const pluginResult = await loadClaudePluginSkills(projectRoot, settings.layers);
  return {
    skills: [...regularSkills, ...pluginResult.skills],
    warnings: pluginResult.warnings,
  };
}

async function loadClaudePluginSkills(
  cwd: string,
  settingsLayers: ClaudeSettingsLayer[],
): Promise<{ skills: ManagedSkill[]; warnings: SkillInventoryWarning[] }> {
  const registryPath = join(homedir(), ".claude", "plugins", "installed_plugins.json");
  const registry = await readJsonObject(registryPath);
  const plugins = isRecord(registry?.plugins) ? registry.plugins : {};
  const warnings: SkillInventoryWarning[] = [];
  const discovered: ManagedSkill[] = [];

  for (const [pluginId, rawInstallations] of Object.entries(plugins)) {
    if (!Array.isArray(rawInstallations)) continue;
    const pluginEnabled = resolveClaudePluginState(settingsLayers, pluginId);
    for (const rawInstallation of rawInstallations) {
      const installation = parseClaudePluginInstallation(rawInstallation);
      if (!installation?.installPath || !installationMatchesProject(installation, cwd)) continue;
      const installPath = resolve(installation.installPath);
      const skillsRoot = join(installPath, "skills");
      try {
        const skills = await scanSkillRoot({
          provider: "claude",
          root: skillsRoot,
          scope: "plugin",
          origin: `Plugin · ${pluginId}`,
          pluginId,
          pluginEnabled,
        });
        discovered.push(...skills);
      } catch (error) {
        warnings.push({ provider: "claude", message: errorMessage(error), path: skillsRoot });
      }
    }
  }
  return { skills: discovered, warnings };
}

async function scanSkillRoot(options: ScannedSkillOptions): Promise<ManagedSkill[]> {
  const files = await findSkillFiles(options.root);
  const pluginName = options.pluginId?.split("@")[0];
  const records: ManagedSkill[] = [];

  for (const skillPath of files) {
    const metadata = await readSkillMetadata(skillPath);
    const directoryName = basename(dirname(skillPath));
    const rawName = options.provider === "claude" ? directoryName : metadata.name || directoryName;
    const name = pluginName ? `${pluginName}:${rawName}` : rawName;
    const resolvedState = options.enabledForName?.(rawName) || {
      enabled: options.pluginEnabled ?? true,
      locked: Boolean(options.pluginId),
      reason: options.pluginId
        ? "Plugin skills are managed by enabling or disabling the entire plugin through /plugin."
        : undefined,
    };
    records.push({
      id: `${options.provider}:${skillPath}`,
      provider: options.provider,
      name,
      description: metadata.description || `Skill ${rawName} has no description.`,
      scope: options.scope,
      enabled: resolvedState.enabled,
      origin: options.origin,
      path: skillPath,
      directory: dirname(skillPath),
      invocation: options.provider === "codex" ? `$${name}` : `/${name}`,
      canToggle: !resolvedState.locked && options.scope !== "system" && options.scope !== "admin",
      statusReason: resolvedState.reason,
      overrideKey: options.pluginId ? undefined : rawName,
      pluginId: options.pluginId,
    });
  }
  return records;
}

async function findSkillFiles(root: string): Promise<string[]> {
  const rootStats = await fs.lstat(root).catch(() => undefined);
  if (!rootStats?.isDirectory() || rootStats.isSymbolicLink()) return [];

  const files: string[] = [];
  const pending: Array<{ directory: string; depth: number }> = [{ directory: root, depth: 0 }];
  let visitedEntries = 0;

  while (pending.length > 0 && visitedEntries < maximumScannedEntries) {
    const current = pending.pop();
    if (!current) break;
    const entries = await fs.readdir(current.directory, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      visitedEntries += 1;
      if (visitedEntries > maximumScannedEntries) break;
      const entryPath = join(current.directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isFile() && entry.name === "SKILL.md") files.push(resolve(entryPath));
      if (entry.isDirectory() && current.depth < maximumScanDepth) {
        pending.push({ directory: entryPath, depth: current.depth + 1 });
      }
    }
  }
  return files;
}

async function findClaudeProjectDirectories(cwd: string): Promise<string[]> {
  const startingDirectory = resolve(cwd);
  const directories = [startingDirectory];
  let currentDirectory = startingDirectory;

  while (true) {
    if (await pathExists(join(currentDirectory, ".git"))) return directories;
    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) return [startingDirectory];
    currentDirectory = parentDirectory;
    directories.push(currentDirectory);
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  return Boolean(await fs.lstat(filePath).catch(() => undefined));
}

async function readSkillMetadata(skillPath: string): Promise<SkillFileMetadata> {
  const text = await readFilePrefix(skillPath, maximumMetadataBytes);
  const frontmatter = parseFrontmatter(text);
  const fallbackName = basename(dirname(skillPath));
  const name = cleanYamlScalar(frontmatter.name || fallbackName) || fallbackName;
  const description = compactText(
    frontmatter.description ||
      frontmatter.short_description ||
      frontmatter["short-description"] ||
      frontmatter.when_to_use ||
      firstBodyParagraph(text),
    420,
  );
  return { name, description };
}

async function readFilePrefix(filePath: string, maximumBytes: number): Promise<string> {
  const handle = await fs.open(filePath, "r");
  try {
    const stats = await handle.stat();
    const buffer = Buffer.alloc(Math.min(stats.size, maximumBytes));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await handle.close();
  }
}

function parseFrontmatter(markdown: string): Record<string, string> {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (lines[0]?.trim() !== "---") return {};
  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (closingIndex < 0) return {};

  const values: Record<string, string> = {};
  let lineIndex = 1;
  while (lineIndex < closingIndex) {
    const match = lines[lineIndex]?.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      lineIndex += 1;
      continue;
    }
    const key = match[1];
    const rawValue = match[2].trim();
    if (/^[>|][+-]?$/.test(rawValue)) {
      const block: string[] = [];
      lineIndex += 1;
      while (lineIndex < closingIndex) {
        const blockLine = lines[lineIndex] || "";
        if (blockLine.trim() && !/^\s+/.test(blockLine)) break;
        block.push(blockLine.replace(/^\s{1,4}/, ""));
        lineIndex += 1;
      }
      values[key] = rawValue.startsWith(">") ? block.join(" ") : block.join("\n");
      continue;
    }
    values[key] = rawValue;
    lineIndex += 1;
  }
  return values;
}

function firstBodyParagraph(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const withoutFrontmatter = normalized.startsWith("---\n")
    ? normalized.replace(/^---\n[\s\S]*?\n---\n?/, "")
    : normalized;
  const paragraphs = withoutFrontmatter.split(/\n\s*\n/);
  for (const paragraph of paragraphs) {
    const candidate = paragraph
      .split("\n")
      .filter((line) => !/^\s*(#|```|[-*+]\s|\d+\.\s)/.test(line))
      .join(" ")
      .trim();
    if (candidate) return candidate;
  }
  return "";
}

function cleanYamlScalar(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === "string" ? parsed : trimmed.slice(1, -1);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

async function loadClaudeSettings(cwd: string): Promise<ClaudeSettingsState> {
  const userPath = join(homedir(), ".claude", "settings.json");
  const projectSharedPath = join(cwd, ".claude", "settings.json");
  const projectPath = join(cwd, ".claude", "settings.local.json");
  const managedPaths = [
    join(homedir(), ".claude", "managed-settings.json"),
    "/Library/Application Support/ClaudeCode/managed-settings.json",
  ];
  const managedDirectory = "/Library/Application Support/ClaudeCode/managed-settings.d";
  const managedFragments = await fs
    .readdir(managedDirectory, { withFileTypes: true })
    .then((entries) =>
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map((entry) => join(managedDirectory, entry.name))
        .sort(),
    )
    .catch(() => []);

  const layerPaths = [userPath, projectSharedPath, projectPath, ...managedPaths, ...managedFragments];
  const layers = (
    await Promise.all(layerPaths.map((settingsPath, index) => readClaudeSettingsLayer(settingsPath, index >= 3)))
  ).filter((layer): layer is ClaudeSettingsLayer => Boolean(layer));
  return { layers, userPath, projectPath };
}

async function readClaudeSettingsLayer(
  settingsPath: string,
  managed: boolean,
): Promise<ClaudeSettingsLayer | undefined> {
  const settings = await readJsonObject(settingsPath);
  if (!settings) return undefined;
  return {
    path: settingsPath,
    managed,
    skillOverrides: parseClaudeSkillOverrides(settings.skillOverrides),
    enabledPlugins: parseBooleanRecord(settings.enabledPlugins),
  };
}

function resolveClaudeSkillState(
  layers: ClaudeSettingsLayer[],
  skillName: string,
): { enabled: boolean; locked: boolean; reason?: string } {
  let override: ClaudeSkillOverride | undefined;
  let source: ClaudeSettingsLayer | undefined;
  for (const layer of layers) {
    if (Object.prototype.hasOwnProperty.call(layer.skillOverrides, skillName)) {
      override = layer.skillOverrides[skillName];
      source = layer;
    }
  }
  const locked = Boolean(source?.managed);
  return {
    enabled: override !== "off",
    locked,
    reason: locked
      ? `The state is fixed by managed configuration in ${source?.path}.`
      : override && override !== "on"
        ? `Visibility is configured as ${override} in ${source?.path}.`
        : undefined,
  };
}

function resolveClaudePluginState(layers: ClaudeSettingsLayer[], pluginId: string): boolean {
  let enabled = true;
  for (const layer of layers) {
    if (Object.prototype.hasOwnProperty.call(layer.enabledPlugins, pluginId)) {
      enabled = layer.enabledPlugins[pluginId];
    }
  }
  return enabled;
}

function markShadowedClaudeProjectSkills(skills: ManagedSkill[]): void {
  const userNames = new Set(skills.filter((skill) => skill.scope === "user").map((skill) => skill.overrideKey));
  for (const skill of skills) {
    if (skill.scope !== "project" || !userNames.has(skill.overrideKey)) continue;
    skill.enabled = false;
    skill.canToggle = false;
    skill.statusReason = "A user skill with the same name takes precedence over this project definition.";
  }
}

async function mergeClaudeSkillOverride(
  settingsPath: string,
  skillName: string,
  value: ClaudeSkillOverride,
): Promise<void> {
  const existingStats = await fs.lstat(settingsPath).catch(() => undefined);
  if (existingStats?.isSymbolicLink()) {
    throw new Error(`For safety, symbolically linked settings are not modified: ${settingsPath}`);
  }
  if (existingStats && !existingStats.isFile()) {
    throw new Error(`The settings path is not a file: ${settingsPath}`);
  }

  const settings = (await readJsonObjectStrict(settingsPath)) || {};
  const currentOverrides = parseClaudeSkillOverrides(settings.skillOverrides);
  const nextOverrides = Object.fromEntries([...Object.entries(currentOverrides), [skillName, value]]);
  const nextSettings = { ...settings, skillOverrides: nextOverrides };
  await atomicWriteJson(settingsPath, nextSettings, existingStats?.mode);
}

async function atomicWriteJson(filePath: string, value: Record<string, unknown>, existingMode?: number): Promise<void> {
  const parentDirectory = dirname(filePath);
  await fs.mkdir(parentDirectory, { recursive: true, mode: 0o700 });
  const temporaryPath = join(parentDirectory, `.${basename(filePath)}.${process.pid}.${randomUUID()}.tmp`);
  const mode = existingMode === undefined ? 0o600 : existingMode & 0o777;
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      mode,
      flag: "wx",
    });
    await fs.chmod(temporaryPath, mode);
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function codexAppServerRequest<T>(method: string, params: unknown, cwd: string): Promise<T> {
  const executable = await findExecutable("codex");
  if (!executable) throw new Error("The codex executable was not found in PATH or the usual locations.");

  return new Promise<T>((resolvePromise, rejectPromise) => {
    const child = spawn(executable, ["app-server", "--stdio"], {
      cwd,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdoutBuffer = "";
    let stderrBuffer = "";
    let settled = false;
    let requestSent = false;
    let stdoutBytes = 0;

    const finish = (error?: Error, result?: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      child.stdin.end();
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGTERM");
        const forceKillTimer = setTimeout(() => {
          if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
        }, 1_500);
        forceKillTimer.unref();
      }
      if (error) rejectPromise(error);
      else resolvePromise(result as T);
    };

    const timeout = setTimeout(() => {
      finish(
        new Error(`Timed out while running ${method}.${stderrBuffer ? ` ${safeDiagnosticText(stderrBuffer)}` : ""}`),
      );
    }, appServerTimeoutMilliseconds);

    child.on("error", (error) => finish(error));
    child.on("exit", (code, signal) => {
      if (!settled) {
        finish(
          new Error(
            `The app server exited before responding (${signal || code || "unknown output"}).${stderrBuffer ? ` ${safeDiagnosticText(stderrBuffer)}` : ""}`,
          ),
        );
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBuffer = `${stderrBuffer}${chunk.toString("utf8")}`.slice(-8_000).trim();
    });
    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes > maximumAppServerOutputBytes) {
        finish(new Error(`The app server produced too much output while running ${method}.`));
        return;
      }
      stdoutBuffer += chunk.toString("utf8");
      while (true) {
        const lineEnd = stdoutBuffer.indexOf("\n");
        if (lineEnd < 0) break;
        const line = stdoutBuffer.slice(0, lineEnd).trim();
        stdoutBuffer = stdoutBuffer.slice(lineEnd + 1);
        if (!line) continue;
        const message = parseJson(line);
        if (!isRecord(message)) continue;
        if (message.id === 0 && !requestSent) {
          if (isRecord(message.error)) {
            finish(new Error(jsonRpcErrorMessage(message.error)));
            return;
          }
          requestSent = true;
          writeJsonLine(child.stdin, { method: "initialized", params: {} });
          writeJsonLine(child.stdin, { method, id: 1, params });
          continue;
        }
        if (message.id !== 1) continue;
        if (isRecord(message.error)) finish(new Error(jsonRpcErrorMessage(message.error)));
        else finish(undefined, message.result as T);
        return;
      }
    });

    writeJsonLine(child.stdin, {
      method: "initialize",
      id: 0,
      params: {
        clientInfo: {
          name: "raycast_cli_claude_codex_skills",
          title: "PromptCast Skills",
          version: "1.0.0",
        },
        capabilities: { experimentalApi: true },
      },
    });
  });
}

function writeJsonLine(stream: NodeJS.WritableStream, value: unknown): void {
  stream.write(`${JSON.stringify(value)}\n`);
}

async function findExecutable(name: string): Promise<string | undefined> {
  const candidates = [
    ...(process.env.PATH || "")
      .split(":")
      .filter(Boolean)
      .map((directory) => join(directory, name)),
    join(homedir(), ".local", "bin", name),
    join(homedir(), ".npm-global", "bin", name),
    `/opt/homebrew/bin/${name}`,
    `/usr/local/bin/${name}`,
    `/usr/bin/${name}`,
  ];
  for (const candidate of new Set(candidates)) {
    try {
      await fs.access(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      continue;
    }
  }
  return undefined;
}

function parseCodexSkillsListEntry(value: unknown): CodexSkillsListEntry | undefined {
  if (!isRecord(value) || !Array.isArray(value.skills) || !Array.isArray(value.errors)) return undefined;
  const skills = value.skills.map(parseCodexSkill).filter((skill): skill is CodexAppServerSkill => Boolean(skill));
  const errors = value.errors
    .map((error) =>
      isRecord(error) && typeof error.message === "string" && typeof error.path === "string"
        ? { message: error.message, path: error.path }
        : undefined,
    )
    .filter((error): error is { message: string; path: string } => Boolean(error));
  return { cwd: typeof value.cwd === "string" ? value.cwd : "", skills, errors };
}

function parseCodexSkill(value: unknown): CodexAppServerSkill | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.name !== "string" ||
    typeof value.description !== "string" ||
    typeof value.path !== "string" ||
    typeof value.enabled !== "boolean" ||
    !["user", "repo", "system", "admin"].includes(String(value.scope))
  ) {
    return undefined;
  }
  const interfaceMetadata = isRecord(value.interface)
    ? {
        displayName: typeof value.interface.displayName === "string" ? value.interface.displayName : null,
        shortDescription:
          typeof value.interface.shortDescription === "string" ? value.interface.shortDescription : null,
      }
    : null;
  return {
    name: value.name,
    description: value.description,
    path: value.path,
    enabled: value.enabled,
    scope: value.scope as CodexAppServerSkill["scope"],
    shortDescription: typeof value.shortDescription === "string" ? value.shortDescription : undefined,
    interface: interfaceMetadata,
  };
}

function parseClaudePluginInstallation(value: unknown): ClaudePluginInstallation | undefined {
  if (!isRecord(value)) return undefined;
  return {
    scope: typeof value.scope === "string" ? value.scope : undefined,
    installPath: typeof value.installPath === "string" ? value.installPath : undefined,
    projectPath: typeof value.projectPath === "string" ? value.projectPath : undefined,
  };
}

function installationMatchesProject(installation: ClaudePluginInstallation, cwd: string): boolean {
  if (!installation.scope || installation.scope === "user") return true;
  if (!installation.projectPath) return false;
  return normalizeComparablePath(installation.projectPath) === normalizeComparablePath(cwd);
}

async function readJsonObject(filePath: string): Promise<Record<string, unknown> | undefined> {
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function readJsonObjectStrict(filePath: string): Promise<Record<string, unknown> | undefined> {
  try {
    const text = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(text);
    if (!isRecord(parsed)) throw new Error(`The file must contain a JSON object: ${filePath}`);
    return parsed;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return undefined;
    if (error instanceof SyntaxError) {
      throw new Error(`${filePath} was not modified because it contains invalid JSON: ${error.message}`);
    }
    throw error;
  }
}

function parseClaudeSkillOverrides(value: unknown): Record<string, ClaudeSkillOverride> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, ClaudeSkillOverride] =>
        typeof entry[1] === "string" && ["on", "name-only", "user-invocable-only", "off"].includes(entry[1]),
    ),
  );
}

function parseBooleanRecord(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
  );
}

async function readCodexSkillOverrides(configPath: string): Promise<{
  paths: Map<string, boolean>;
  names: Map<string, boolean>;
}> {
  const paths = new Map<string, boolean>();
  const names = new Map<string, boolean>();
  const text = await fs.readFile(configPath, "utf8").catch(() => "");
  const blocks = text.split(/(?=^\s*\[\[skills\.config\]\]\s*$)/m);
  for (const block of blocks) {
    if (!/^\s*\[\[skills\.config\]\]/.test(block)) continue;
    const enabledMatch = block.match(/^\s*enabled\s*=\s*(true|false)\s*$/m);
    if (!enabledMatch) continue;
    const enabled = enabledMatch[1] === "true";
    const pathMatch = block.match(/^\s*path\s*=\s*("(?:\\.|[^"\\])*"|'[^']*')\s*$/m);
    const nameMatch = block.match(/^\s*name\s*=\s*("(?:\\.|[^"\\])*"|'[^']*')\s*$/m);
    if (pathMatch && !nameMatch) {
      const path = parseTomlString(pathMatch[1]);
      if (path) paths.set(normalizeComparablePath(path), enabled);
    }
    if (nameMatch && !pathMatch) {
      const name = parseTomlString(nameMatch[1]);
      if (name) names.set(name.trim(), enabled);
    }
  }
  return { paths, names };
}

function parseTomlString(value: string): string | undefined {
  if (value.startsWith("'")) return value.slice(1, -1);
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "string" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function codexOverrideEnabled(
  overrides: { paths: Map<string, boolean>; names: Map<string, boolean> },
  name: string,
  root: string,
): boolean {
  return overrides.names.get(name) ?? overrides.paths.get(normalizeComparablePath(root)) ?? true;
}

function codexScope(scope: CodexAppServerSkill["scope"]): SkillScope {
  return scope === "repo" ? "project" : scope;
}

function codexOrigin(scope: SkillScope, skillPath: string): string {
  if (scope === "system") return `Codex · ${"System"}`;
  if (scope === "admin") return `Codex · ${"Managed"}`;
  if (scope === "project") return `Codex · ${"Current project"}`;
  if (skillPath.includes(`${sep}.codex${sep}plugins${sep}`)) return "Codex plugin";
  return `Codex · ${"User"}`;
}

function normalizeSkillFilePath(skillPath: string): string {
  return basename(skillPath).toLowerCase() === "skill.md" ? resolve(skillPath) : resolve(skillPath, "SKILL.md");
}

function normalizeComparablePath(value: string): string {
  return resolve(value).normalize("NFC").replace(/\/$/, "");
}

function deduplicateSkills(skills: ManagedSkill[]): ManagedSkill[] {
  const unique = new Map<string, ManagedSkill>();
  for (const skill of skills) {
    const key = `${skill.provider}:${normalizeComparablePath(skill.path)}`;
    if (!unique.has(key)) unique.set(key, skill);
  }
  return [...unique.values()];
}

function compareSkills(left: ManagedSkill, right: ManagedSkill): number {
  const providerOrder = left.provider.localeCompare(right.provider);
  if (providerOrder !== 0) return providerOrder;
  const scopeOrder = scopeRank(left.scope) - scopeRank(right.scope);
  if (scopeOrder !== 0) return scopeOrder;
  return left.name.localeCompare(right.name, "en", { sensitivity: "base" });
}

function scopeRank(scope: SkillScope): number {
  return { project: 0, user: 1, plugin: 2, system: 3, admin: 4 }[scope];
}

function compactText(value: string, maximumLength: number): string {
  const compacted = cleanYamlScalar(value || "")
    .replace(/\s+/g, " ")
    .trim();
  return compacted.length <= maximumLength ? compacted : `${compacted.slice(0, maximumLength - 1).trimEnd()}…`;
}

function assertSkillCanBeChanged(skill: ManagedSkill): void {
  if (!skill.canToggle || skill.scope === "system" || skill.scope === "admin") {
    throw new Error(skill.statusReason || "This skill is managed and can only be viewed.");
  }
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && "code" in value;
}

function jsonRpcErrorMessage(error: Record<string, unknown>): string {
  const message = typeof error.message === "string" ? error.message : "Unknown app-server error";
  return typeof error.code === "number" ? `${message} (${error.code})` : message;
}

function errorMessage(error: unknown): string {
  return safeDiagnosticText(error instanceof Error ? error.message : String(error));
}

function safeDiagnosticText(value: string): string {
  return value
    .replace(/\bBearer\s+[^\s,;]+/giu, "Bearer <hidden>")
    .replace(
      /\b((?:api[-_ ]?key|token|secret|password|authorization|client[-_ ]?secret)\s*[:=]\s*)[^\s,;]+/giu,
      "$1<hidden>",
    )
    .replace(/[\r\n\t]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 800);
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
