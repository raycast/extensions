import { readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { OrcaCliError } from "./orca-cli";

export type Harness = "claude" | "antigravity" | "grok" | string;

export type Bot = {
  id: string;
  name: string;
  harness: Harness;
  specialty: string;
  paused: boolean;
  /** Chemin absolu du dossier du bot, ou null si bot.json est introuvable ou illisible. */
  folder: string | null;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * Transforme le `result` de `orca bot list` en bots.
 * `folders` associe un id de bot à son dossier (voir readBotFolders) : un id absent donne `folder: null`.
 */
export function parseBotList(result: unknown, folders: Map<string, string>): Bot[] {
  const rawBots = asRecord(result).bots;
  if (!Array.isArray(rawBots)) {
    return [];
  }

  const bots: Bot[] = [];
  for (const raw of rawBots) {
    const record = asRecord(raw);
    const id = asString(record.id);
    // Sans id, le bot ne peut ni être sollicité ni apparié à son dossier.
    if (!id) {
      continue;
    }
    bots.push({
      id,
      name: asString(record.name) || id,
      harness: asString(record.agent),
      specialty: asString(record.specialty),
      paused: record.paused === true,
      folder: folders.get(id) ?? null,
    });
  }
  return bots;
}

/**
 * Lit le bot.json de chaque sous-dossier de `botsDir` et associe `bot.json.id` au dossier.
 * Un dossier sans bot.json, un JSON invalide ou un id non textuel sont ignorés en silence :
 * le bot concerné restera visible mais sans dossier résolu.
 */
export function readBotFolders(botsDir: string = join(homedir(), ".orca/bots")): Map<string, string> {
  const folders = new Map<string, string>();

  let names: string[];
  try {
    names = readdirSync(botsDir);
  } catch {
    return folders;
  }

  for (const name of names) {
    const folder = join(botsDir, name);
    try {
      const id = asRecord(JSON.parse(readFileSync(join(folder, "bot.json"), "utf8"))).id;
      if (typeof id === "string" && id) {
        folders.set(id, folder);
      }
    } catch {
      // bot.json absent, illisible ou invalide : on passe au suivant.
    }
  }
  return folders;
}

/**
 * Lit le bot d'un dossier (préférence « Bot par défaut ») depuis son bot.json, sans passer par la CLI.
 * Renvoie null si bot.json est absent, illisible, ou sans `id` ni `agent` : le dossier n'est pas un bot utilisable.
 * `paused` vaut toujours false : bot.json ne porte pas l'état de pause, Orca refusera l'envoi si besoin.
 */
export function readBotFromFolder(folder: string): Bot | null {
  const expanded = folder.startsWith("~/") ? join(homedir(), folder.slice(2)) : folder;
  const normalized = expanded.replace(/\/+$/, "");
  try {
    const record = asRecord(JSON.parse(readFileSync(join(normalized, "bot.json"), "utf8")));
    const id = asString(record.id);
    const harness = asString(record.agent);
    if (!id || !harness) {
      return null;
    }
    return { id, name: asString(record.name) || id, harness, specialty: "", paused: false, folder: normalized };
  } catch {
    return null;
  }
}

/** Bot par défaut en tête, puis dernier utilisé, puis non pausés avant pausés, puis ordre alphabétique. */
export function sortBots(bots: Bot[], lastUsedId?: string, defaultId?: string): Bot[] {
  const rank = (bot: Bot): number => (bot.id === defaultId ? -1 : bot.id === lastUsedId ? 0 : bot.paused ? 2 : 1);
  return [...bots].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "en"));
}

/**
 * Arguments de `orca agent launch` pour solliciter un bot dans son dossier.
 * Jamais de `--focus` : Orca ne doit pas passer au premier plan.
 * Refuse de deviner un chemin quand le dossier du bot n'est pas résolu.
 */
export function launchArgs(bot: Bot, prompt: string): string[] {
  if (bot.folder === null) {
    throw new OrcaCliError(
      "bot_folder_missing",
      `Bot folder not found for ${bot.name}: cannot launch without risking a wrong path.`,
    );
  }
  return [
    "agent",
    "launch",
    "--agent",
    bot.harness,
    "--worktree",
    `path:${bot.folder}`,
    "--surface",
    "chat",
    // Forme `--prompt=<valeur>` en un seul argument : le parseur d'Orca prendrait sinon
    // un prompt commençant par `--` pour un autre flag (« Unknown flag »).
    `--prompt=${prompt}`,
  ];
}

/**
 * `result.outcome.sessionId` de `orca agent launch`, ou null quand il manque
 * (repli terminal : le prompt est parti mais aucune session de chat n'est lisible).
 */
export function extractSessionId(result: unknown): string | null {
  const sessionId = asRecord(asRecord(result).outcome).sessionId;
  return typeof sessionId === "string" && sessionId !== "" ? sessionId : null;
}
