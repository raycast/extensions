import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { readdir, realpath } from "node:fs/promises";

import YAML from "yaml";

import type { Preferences, RimeInstallation, RimeSchema } from "../types";
import { BLOCKED_WORDS_FILE_NAME, COMMON_SQUIRREL_PATHS, LOWERED_WORDS_FILE_NAME } from "./constants";
import { exists, readText } from "./files";

const execFileAsync = promisify(execFile);

function objectAtPath(value: unknown, path: string[]): unknown {
  let current = value;
  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

async function findSquirrelApp(): Promise<string | undefined> {
  const candidates = [
    ...COMMON_SQUIRREL_PATHS,
    join(homedir(), "Library", "Input Methods", "Squirrel.app"),
    join(homedir(), "Applications", "Squirrel.app"),
  ];
  for (const path of candidates) if (await exists(path)) return path;
  return undefined;
}

async function inspectUserDataDirectory(path: string): Promise<{ path: string; score: number } | undefined> {
  try {
    const resolvedPath = resolve(path);
    if (
      resolvedPath.split("/").includes(".raycast-rime-manager") ||
      ["build", "trash"].includes(basename(resolvedPath))
    ) {
      return undefined;
    }
    const entries = await readdir(path, { withFileTypes: true });
    const names = new Set(entries.filter((entry) => entry.isFile()).map((entry) => entry.name));
    const schemaCount = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".schema.yaml")).length;
    const hasInstallation = names.has("installation.yaml");
    const hasUserState = names.has("user.yaml");
    const hasDefaultConfig = names.has("default.yaml") || names.has("default.custom.yaml");
    if (schemaCount === 0 && !(hasInstallation && (hasUserState || hasDefaultConfig))) return undefined;
    const canonicalPath = await realpath(path).catch(() => resolve(path));
    return {
      path: canonicalPath,
      score: schemaCount * 10 + Number(hasInstallation) * 4 + Number(hasUserState) * 2 + Number(hasDefaultConfig),
    };
  } catch {
    return undefined;
  }
}

async function findSpotlightUserDataDirectories(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      "/usr/bin/mdfind",
      ["-onlyin", homedir(), "kMDItemFSName == 'installation.yaml'c"],
      { timeout: 3_000, maxBuffer: 512 * 1024 },
    );
    return stdout
      .split(/\r?\n/)
      .map((path) => path.trim())
      .filter(Boolean)
      .map(dirname);
  } catch {
    return [];
  }
}

export async function discoverRimeUserDataDirectory(preferences: Preferences): Promise<string> {
  if (preferences.rimeUserDirectory) {
    const selected = await inspectUserDataDirectory(preferences.rimeUserDirectory);
    if (!selected) {
      throw new Error(`The selected folder is not a valid Rime user data directory: ${preferences.rimeUserDirectory}`);
    }
    return selected.path;
  }

  const knownCandidates = [join(homedir(), "Library", "Rime")];
  const knownDirectories = (
    await Promise.all(knownCandidates.map((candidate) => inspectUserDataDirectory(candidate)))
  ).filter((candidate): candidate is { path: string; score: number } => Boolean(candidate));
  const standardPath = await realpath(knownCandidates[0]).catch(() => resolve(knownCandidates[0]));
  const standard = knownDirectories.find((candidate) => candidate.path === standardPath);
  if (standard) return standard.path;
  if (knownDirectories.length > 0) {
    return knownDirectories.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))[0]
      .path;
  }

  const spotlightCandidates = await findSpotlightUserDataDirectories();
  const discoveredDirectories = (
    await Promise.all([...new Set(spotlightCandidates)].map((candidate) => inspectUserDataDirectory(candidate)))
  ).filter((candidate): candidate is { path: string; score: number } => Boolean(candidate));
  if (discoveredDirectories.length === 0) {
    throw new Error("No Rime user data directory was found. Select one in the extension preferences.");
  }
  return discoveredDirectories.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))[0]
    .path;
}

async function readYaml(path: string): Promise<Record<string, unknown>> {
  const source = await readText(path);
  if (!source) return {};
  try {
    return (YAML.parse(source) as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

async function discoverSchemas(userDataDir: string): Promise<RimeSchema[]> {
  const entries = await readdir(userDataDir, { withFileTypes: true });
  const schemaFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".schema.yaml"));
  const schemas = await Promise.all(
    schemaFiles.map(async (entry): Promise<RimeSchema> => {
      const path = join(userDataDir, entry.name);
      const sourcePromise = readText(path);
      const documentPromise = readYaml(path);
      const [source, document] = await Promise.all([sourcePromise, documentPromise]);
      const fallbackId = entry.name.slice(0, -".schema.yaml".length);
      const id = String(objectAtPath(document, ["schema", "schema_id"]) ?? fallbackId);
      const name = String(objectAtPath(document, ["schema", "name"]) ?? id);
      const customPath = join(userDataDir, `${id}.custom.yaml`);
      const customSource = await readText(customPath);
      return {
        id,
        name,
        path,
        customPath,
        hasPinCandidateFilter: `${source}\n${customSource}`.includes("lua_filter@*pin_cand_filter"),
        hasExistingBlockedWordsFilter: `${source}\n${customSource}`.includes("lua_filter@*blocked_words_filter"),
      };
    }),
  );
  return schemas.sort((a, b) => a.name.localeCompare(b.name));
}

function schemaIdsFromDocument(document: Record<string, unknown>, fromPatch: boolean): string[] {
  const root = fromPatch ? objectAtPath(document, ["patch", "schema_list"]) : document.schema_list;
  if (!Array.isArray(root)) return [];
  return root.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const id = (entry as Record<string, unknown>).schema;
    return typeof id === "string" ? [id] : [];
  });
}

export async function inspectRimeInstallation(preferences: Preferences): Promise<RimeInstallation> {
  const userDataDir = await discoverRimeUserDataDirectory(preferences);

  const installationPath = join(userDataDir, "installation.yaml");
  const userPath = join(userDataDir, "user.yaml");
  const defaultCustomPath = join(userDataDir, "default.custom.yaml");
  const defaultPath = join(userDataDir, "default.yaml");
  const [installation, user, discoveredSchemas, squirrelAppPath, defaultCustom, defaultConfig] = await Promise.all([
    readYaml(installationPath),
    readYaml(userPath),
    discoverSchemas(userDataDir),
    findSquirrelApp(),
    readYaml(defaultCustomPath),
    readYaml(defaultPath),
  ]);

  const enabledSchemaIds = [
    ...schemaIdsFromDocument(defaultCustom, true),
    ...schemaIdsFromDocument(defaultConfig, false),
  ];
  const uniqueEnabledSchemaIds = [...new Set(enabledSchemaIds)];
  const schemaById = new Map(discoveredSchemas.map((schema) => [schema.id, schema]));
  const enabledSchemas = uniqueEnabledSchemaIds.flatMap((id) => {
    const schema = schemaById.get(id);
    return schema ? [schema] : [];
  });
  const schemas = enabledSchemas.length > 0 ? enabledSchemas : discoveredSchemas;
  if (schemas.length === 0) throw new Error(`No Rime schemas were found in ${userDataDir}.`);
  const previouslySelectedSchema = objectAtPath(user, ["var", "previously_selected_schema"]);
  const currentSchemaId = previouslySelectedSchema ? String(previouslySelectedSchema) : schemas[0]?.id;

  const hasExistingBlockedWordsFilter =
    (await exists(join(userDataDir, "lua", "blocked_words_filter.lua"))) &&
    schemas.some((schema) => schema.hasExistingBlockedWordsFilter);
  const blockedWordsPath = join(
    userDataDir,
    hasExistingBlockedWordsFilter ? "blocked_words.txt" : BLOCKED_WORDS_FILE_NAME,
  );

  return {
    userDataDir,
    squirrelAppPath,
    squirrelExecutable: squirrelAppPath ? join(squirrelAppPath, "Contents", "MacOS", "Squirrel") : undefined,
    distributionName: installation.distribution_name ? String(installation.distribution_name) : undefined,
    distributionVersion: installation.distribution_version ? String(installation.distribution_version) : undefined,
    rimeVersion: installation.rime_version ? String(installation.rime_version) : undefined,
    currentSchemaId,
    schemas,
    hasExistingBlockedWordsFilter,
    blockedWordsPath,
    loweredWordsPath: join(userDataDir, LOWERED_WORDS_FILE_NAME),
    squirrelCustomPath: join(userDataDir, "squirrel.custom.yaml"),
  };
}

export async function runSquirrelAction(installation: RimeInstallation, action: "reload" | "sync"): Promise<void> {
  if (!installation.squirrelExecutable || !(await exists(installation.squirrelExecutable))) {
    throw new Error("Squirrel.app was not found. Install Squirrel or check its application location.");
  }
  await execFileAsync(installation.squirrelExecutable, [`--${action}`], { timeout: 120_000 });
}

export function currentSchema(installation: RimeInstallation): RimeSchema | undefined {
  return installation.schemas.find((schema) => schema.id === installation.currentSchemaId) ?? installation.schemas[0];
}

export function displayPath(path: string): string {
  const home = homedir();
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path;
}

export function schemaDescription(schema: RimeSchema): string {
  return `${schema.name} · ${basename(schema.path)}`;
}
