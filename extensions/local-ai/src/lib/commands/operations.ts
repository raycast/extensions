import { parsePrompt } from "../placeholders";
import type { AiCommand, CommandFields } from "./types";

export const MAX_NAME_LENGTH = 60;

const COPY_SUFFIX = " Copy";

export function validateCommandFields(fields: CommandFields): string[] {
  const errors: string[] = [];
  const name = fields.name.trim();
  if (!name) errors.push("Name is required");
  else if (name.length > MAX_NAME_LENGTH) errors.push(`Name must be ${MAX_NAME_LENGTH} characters or fewer`);
  if (!fields.prompt.trim()) errors.push("Prompt is required");
  else errors.push(...parsePrompt(fields.prompt).errors);
  return errors;
}

export function createCommand(fields: CommandFields, deps: { id: string; now: string }): AiCommand {
  return {
    ...fields,
    name: fields.name.trim(),
    id: deps.id,
    pinned: false,
    isStarter: false,
    createdAt: deps.now,
    updatedAt: deps.now,
  };
}

export function updateCommand(
  command: AiCommand,
  patch: Partial<CommandFields & { pinned: boolean }>,
  now: string,
): AiCommand {
  return { ...command, ...patch, updatedAt: now };
}

export function duplicateCommand(command: AiCommand, deps: { id: string; now: string }): AiCommand {
  return {
    ...command,
    id: deps.id,
    name: command.name.slice(0, MAX_NAME_LENGTH - COPY_SUFFIX.length).trimEnd() + COPY_SUFFIX,
    pinned: false,
    isStarter: false,
    createdAt: deps.now,
    updatedAt: deps.now,
  };
}

export function removeCommand(commands: AiCommand[], id: string): AiCommand[] {
  return commands.filter((command) => command.id !== id);
}

export function resetStarters(commands: AiCommand[], starters: AiCommand[]): AiCommand[] {
  const existing = new Map(commands.map((command) => [command.id, command]));
  const starterIds = new Set(starters.map((starter) => starter.id));
  const restored = starters.map((starter) => ({ ...starter, pinned: existing.get(starter.id)?.pinned ?? false }));
  const others = commands.filter((command) => !starterIds.has(command.id));
  return [...restored, ...others];
}

export function sortCommands(commands: AiCommand[]): AiCommand[] {
  return [...commands].sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name));
}
