import { promises as fs } from "node:fs";
import path from "node:path";
import { environment } from "@raycast/api";

export type Rule = { uuid: string; display: string; hdr: boolean };
export type RulesFile = { version: 2; rules: Rule[] };
export type SeenDisplay = { uuid: string; id: number };

type SeenFile = { version: 2; displays: SeenDisplay[] };

function supportPath(): string {
  return environment.supportPath;
}

function rulesPath(): string {
  return path.join(supportPath(), "rules.json");
}

function seenPath(): string {
  return path.join(supportPath(), "seen.json");
}

function emptyRules(): RulesFile {
  return { version: 2, rules: [] };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRule(value: unknown): value is Rule {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return isNonEmptyString(record.uuid) && isNonEmptyString(record.display) && typeof record.hdr === "boolean";
}

async function writeFileAtomic(filePath: string, contents: string): Promise<void> {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });
  const tempPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`,
  );
  try {
    await fs.writeFile(tempPath, contents, "utf8");
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

/** Missing or malformed rules mean "no rules"; the view stays usable. */
export async function readRules(): Promise<RulesFile> {
  try {
    const raw = await fs.readFile(rulesPath(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return emptyRules();

    const record = parsed as Record<string, unknown>;
    if (record.version !== 2 || !Array.isArray(record.rules)) return emptyRules();

    const rules: Rule[] = [];
    for (const entry of record.rules) {
      if (!isRule(entry)) return emptyRules();
      rules.push({ uuid: entry.uuid, display: entry.display, hdr: entry.hdr });
    }
    return { version: 2, rules };
  } catch {
    return emptyRules();
  }
}

export async function writeRules(rules: Rule[]): Promise<void> {
  const payload: RulesFile = {
    version: 2,
    rules: rules.map((rule) => ({ uuid: rule.uuid, display: rule.display, hdr: rule.hdr })),
  };
  await writeFileAtomic(rulesPath(), `${JSON.stringify(payload, null, 2)}\n`);
}

/**
 * `null` means there is no usable history, so the caller treats this as a first
 * run. The display id is kept alongside the UUID because macOS usually assigns
 * a new id on reconnect, which lets a check notice a reconnect that happened
 * between two runs.
 */
export async function readSeen(): Promise<SeenDisplay[] | null> {
  try {
    const raw = await fs.readFile(seenPath(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const record = parsed as Record<string, unknown>;
    if (record.version !== 2 || !Array.isArray(record.displays)) return null;

    const displays: SeenDisplay[] = [];
    for (const entry of record.displays) {
      if (typeof entry !== "object" || entry === null) return null;
      const candidate = entry as Record<string, unknown>;
      if (!isNonEmptyString(candidate.uuid) || typeof candidate.id !== "number") return null;
      displays.push({ uuid: candidate.uuid, id: candidate.id });
    }
    return displays;
  } catch {
    // Missing or unreadable: either way there is no known connection history.
    return null;
  }
}

export async function writeSeen(displays: SeenDisplay[]): Promise<void> {
  const payload: SeenFile = {
    version: 2,
    displays: displays.map((display) => ({ uuid: display.uuid, id: display.id })),
  };
  await writeFileAtomic(seenPath(), `${JSON.stringify(payload, null, 2)}\n`);
}
