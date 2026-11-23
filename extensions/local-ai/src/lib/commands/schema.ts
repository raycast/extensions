import { isRecord, loadVersionedStore, type VersionedLoad, type VersionedStoreSpec } from "../versioned-store";
import {
  COMMAND_STORE_VERSION,
  DEFAULT_ICON,
  type AiCommand,
  type CommandDefaults,
  type CommandStore,
  type OutputMode,
} from "./types";

export type MigrateResult = VersionedLoad<CommandStore>;

export function migrateCommandStore(
  raw: string | undefined,
  defaults: CommandDefaults = FALLBACK_DEFAULTS,
): MigrateResult {
  return loadVersionedStore(raw, commandStoreSpec(defaults));
}

export function commandStoreSpec(defaults: CommandDefaults = FALLBACK_DEFAULTS): VersionedStoreSpec<CommandStore> {
  return {
    version: COMMAND_STORE_VERSION,
    parse: (value) => {
      const entries: unknown = value.commands;
      if (!Array.isArray(entries)) return undefined;
      const commands = entries.flatMap((entry) => normalizeCommand(entry, defaults) ?? []);
      const changed = commands.length !== entries.length || commands.some((c, i) => !sameShape(c, entries[i]));
      return {
        store: { version: COMMAND_STORE_VERSION, commands },
        changed,
        entries: entries.length,
        kept: commands.length,
      };
    },
  };
}

export function normalizeCommand(value: unknown, defaults: CommandDefaults): AiCommand | undefined {
  if (!isRecord(value)) return undefined;
  const id = nonEmptyString(value.id);
  const name = nonEmptyString(value.name);
  const prompt = nonEmptyString(value.prompt);
  if (!id || !name || !prompt) return undefined;
  const now = new Date(0).toISOString();
  return {
    id,
    name,
    prompt,
    icon: nonEmptyString(value.icon) ?? DEFAULT_ICON,
    output: outputMode(value.output),
    model: nonEmptyString(value.model) ?? defaults.model,
    creativity:
      value.creativity === "precise" || value.creativity === "normal" ? value.creativity : defaults.creativity,
    useCase: value.useCase === "content-tagging" ? "content-tagging" : "general",
    guardrails: value.guardrails === "default" ? "default" : "permissive",
    pinned: value.pinned === true,
    isStarter: value.isStarter === true,
    createdAt: nonEmptyString(value.createdAt) ?? now,
    updatedAt: nonEmptyString(value.updatedAt) ?? now,
  };
}

const FALLBACK_DEFAULTS: CommandDefaults = { model: "system", creativity: "normal" };

function outputMode(value: unknown): OutputMode {
  return value === "replace" ? "replace" : "window";
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function sameShape(command: AiCommand, original: unknown): boolean {
  if (!isRecord(original)) return false;
  return (Object.keys(command) as (keyof AiCommand)[]).every((key) => original[key] === command[key]);
}
