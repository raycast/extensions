// Lists fabric's objects. Names always come from `--shell-complete-list`
// (plain -x/-X print "No Contexts"/"No Sessions" lines that would parse as
// items). Descriptions and counts are read from fabric's own files.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { type ModelRow, parseModels } from "./models";
import { runFabric } from "./runner";
import { messageCount, parseSession } from "./session";

// A test seam, named so it can't be taken for a fabric setting: test/preload.ts points it at a temp
// folder so no test touches the real one. Raycast never sets it. `||`, not `??`: an empty value
// would make every folder below relative to the working directory.
export const FABRIC_DIR = process.env.FABRIC_RAYCAST_TEST_DIR || join(homedir(), ".config", "fabric");
export const PATTERNS_DIR = join(FABRIC_DIR, "patterns");
export const CUSTOM_DIR = join(FABRIC_DIR, "custom");
export const STRATEGIES_DIR = join(FABRIC_DIR, "strategies");
export const CONTEXTS_DIR = join(FABRIC_DIR, "contexts");
export const SESSIONS_DIR = join(FABRIC_DIR, "sessions");

export interface PatternItem {
  name: string;
  description?: string;
  /** Lives in the Custom Patterns folder (editable). */
  own: boolean;
}

export interface SessionItem {
  name: string;
  /** User + assistant messages; undefined when the file could not be read. */
  messages?: number;
}

/** One name per line, deduped: `-L` lists a model once per vendor that offers it. */
export function parseList(stdout: string): string[] {
  return [
    ...new Set(
      stdout
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    ),
  ];
}

export function parseExplanations(md: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const line of md.split("\n")) {
    const hit = /^\s*\d+\.\s+\*\*([^*]+)\*\*:\s*(.+?)\s*$/.exec(line);
    if (hit) m.set(hit[1], hit[2]);
  }
  return m;
}

async function fabricOut(fabricPath: string, args: string[], env?: NodeJS.ProcessEnv): Promise<string> {
  const r = await runFabric(fabricPath, args, { env }).done;
  // r.stderr comes redacted from runFabric: this message is shown in the failure state and offered as Copy Error.
  if (r.code !== 0) throw new Error((r.stderr || r.error || `fabric exited ${r.code}`).trim());
  return r.stdout;
}

export async function listNames(fabricPath: string, flag: string, env?: NodeJS.ProcessEnv): Promise<string[]> {
  return parseList(await fabricOut(fabricPath, [flag, "--shell-complete-list"], env));
}

/** A list load that fails open: dropdowns and checks get `[]` instead of an error. */
export const orEmpty = <T>(p: Promise<T[]>): Promise<T[]> => p.catch(() => []);

export function readText(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

function firstProseLine(md: string | undefined): string | undefined {
  return md
    ?.split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#"));
}

function dirNames(dir: string): Set<string> {
  try {
    return new Set(
      readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name),
    );
  } catch {
    return new Set();
  }
}

export interface PatternDirs {
  patternsDir?: string;
  myPatternsDir?: string;
  env?: NodeJS.ProcessEnv;
}

export async function loadPatterns(fabricPath: string, dirs: PatternDirs = {}): Promise<PatternItem[]> {
  const patternsDir = dirs.patternsDir ?? PATTERNS_DIR;
  const myDir = dirs.myPatternsDir ?? CUSTOM_DIR;
  const names = await listNames(fabricPath, "--listpatterns", dirs.env);
  const explained = parseExplanations(readText(join(patternsDir, "pattern_explanations.md")) ?? "");
  const own = dirNames(myDir);
  return names.map((name) => ({
    name,
    own: own.has(name),
    description:
      explained.get(name) ?? firstProseLine(readText(join(own.has(name) ? myDir : patternsDir, name, "system.md"))),
  }));
}

/** system.md of a pattern, from Custom Patterns first, else the built-ins. */
export function readSystemPrompt(name: string, dirs: PatternDirs = {}): string | undefined {
  const own = join(dirs.myPatternsDir ?? CUSTOM_DIR, name, "system.md");
  return readText(existsSync(own) ? own : join(dirs.patternsDir ?? PATTERNS_DIR, name, "system.md"));
}

function countMessages(path: string): number | undefined {
  const raw = readText(path);
  if (raw === undefined) return undefined;
  try {
    return messageCount(parseSession(raw)).turns;
  } catch {
    return undefined;
  }
}

export interface Strategy {
  description?: string;
  prompt?: string;
}

/**
 * A strategy's JSON: `{}` when the file is missing, `undefined` when it exists
 * but isn't a JSON object (so an editor can refuse it instead of opening blank
 * and saving the blanks over a hand-written prompt).
 */
export function readStrategy(name: string, dir = STRATEGIES_DIR): Strategy | undefined {
  const raw = readText(join(dir, `${name}.json`));
  if (raw === undefined) return {};
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
    const o = v as Record<string, unknown>;
    return {
      description: typeof o.description === "string" ? o.description : undefined,
      prompt: typeof o.prompt === "string" ? o.prompt : undefined,
    };
  } catch {
    return undefined;
  }
}

/** One top-level `key: value` from a run-profile YAML: quotes and a trailing `# comment` stripped; empty → undefined. */
export function profileKey(yaml: string, k: string): string | undefined {
  const m = new RegExp(`^${k}:[ \\t]*(?:"([^"\\n]*)"|'([^'\\n]*)'|([^#\\n]*?))[ \\t]*(?:#.*)?$`, "m").exec(yaml);
  return (m && (m[1] ?? m[2] ?? m[3])) || undefined;
}

export async function loadSessions(
  fabricPath: string,
  opts: { sessionsDir?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<SessionItem[]> {
  const dir = opts.sessionsDir ?? SESSIONS_DIR;
  const names = await listNames(fabricPath, "--listsessions", opts.env);
  return names.map((name) => ({ name, messages: countMessages(join(dir, `${name}.json`)) }));
}

export const loadStrategies = (fabricPath: string, env?: NodeJS.ProcessEnv) =>
  listNames(fabricPath, "--liststrategies", env);
export const loadContexts = (fabricPath: string, env?: NodeJS.ProcessEnv) =>
  listNames(fabricPath, "--listcontexts", env);
export const loadModels = (fabricPath: string, env?: NodeJS.ProcessEnv) => listNames(fabricPath, "--listmodels", env);
/** `-L`'s table, each model with its vendor: the same name under two vendors stays two rows. */
export const loadModelRows = async (fabricPath: string, env?: NodeJS.ProcessEnv): Promise<ModelRow[]> =>
  parseModels(await fabricOut(fabricPath, ["--listmodels"], env));
export const loadTranscriptionModels = (fabricPath: string, env?: NodeJS.ProcessEnv) =>
  listNames(fabricPath, "--list-transcription-models", env);

export interface ProfileItem {
  name: string;
  path: string;
  model?: string;
  vendor?: string;
}

/** Run profiles are `--config` YAML files in the extension's support folder. */
export function loadProfiles(dir: string): ProfileItem[] {
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".yaml"));
  } catch {
    return [];
  }
  return files.sort().map((f) => {
    const yaml = readText(join(dir, f)) ?? "";
    return {
      name: f.slice(0, -5),
      path: join(dir, f),
      model: profileKey(yaml, "model"),
      vendor: profileKey(yaml, "vendor"),
    };
  });
}
