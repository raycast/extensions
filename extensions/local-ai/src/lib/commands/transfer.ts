import { isRecord } from "../versioned-store";
import { createCommand, validateCommandFields } from "./operations";
import { normalizeCommand } from "./schema";
import { DEFAULT_ICON, type AiCommand, type CommandDefaults } from "./types";

export const MAX_IMPORT_BYTES = 1_000_000;
export const MAX_IMPORT_COMMANDS = 500;

export class ImportError extends Error {}

export interface ImportContext {
  existingIds: ReadonlySet<string>;
  validIconNames: ReadonlySet<string>;
  newId: () => string;
  now: string;
  defaults: CommandDefaults;
}

export interface ImportReport {
  imported: AiCommand[];
  skipped: { index: number; reason: string }[];
}

const STARTER_ID_PREFIX = "starter-";

export function serializeExport(commands: AiCommand[]): string {
  const exported = commands.map((command) => {
    const copy: Partial<AiCommand> = { ...command };
    delete copy.pinned;
    delete copy.isStarter;
    return copy;
  });
  return JSON.stringify(exported, null, 2);
}

export function parseImport(json: string, ctx: ImportContext): ImportReport {
  if (new TextEncoder().encode(json).length > MAX_IMPORT_BYTES) throw new ImportError("The file is larger than 1 MB");
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new ImportError("The file is not valid JSON");
  }
  if (!Array.isArray(parsed)) throw new ImportError("The file must contain a JSON array of commands");
  if (parsed.length > MAX_IMPORT_COMMANDS) throw new ImportError("A file can hold at most 500 commands");

  const usedIds = new Set(ctx.existingIds);
  const report: ImportReport = { imported: [], skipped: [] };
  parsed.forEach((item, index) => {
    const result = importItem(item, ctx, usedIds);
    if (typeof result === "string") {
      report.skipped.push({ index, reason: result });
      return;
    }
    usedIds.add(result.id);
    report.imported.push(result);
  });
  return report;
}

function importItem(item: unknown, ctx: ImportContext, usedIds: ReadonlySet<string>): AiCommand | string {
  if (!isRecord(item)) return "Not a command object";
  const missing = missingRequiredField(item);
  if (missing) return missing;
  const normalized = normalizeCommand(item, ctx.defaults);
  if (!normalized) return "Not a valid command";
  const errors = validateCommandFields(normalized);
  if (errors.length > 0) return errors[0];
  const conflicts = usedIds.has(normalized.id) || normalized.id.startsWith(STARTER_ID_PREFIX);
  return createCommand(
    { ...normalized, icon: ctx.validIconNames.has(normalized.icon) ? normalized.icon : DEFAULT_ICON },
    { id: conflicts ? ctx.newId() : normalized.id, now: ctx.now },
  );
}

function missingRequiredField(item: Record<string, unknown>): string | undefined {
  if (!hasText(item.id)) return "Id is required";
  if (!hasText(item.name)) return "Name is required";
  if (!hasText(item.prompt)) return "Prompt is required";
  return undefined;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
