import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type Shortcut = {
  id: string;
  name: string;
};

type ShortcutListRow = {
  name: string;
  id?: string;
};

export async function listShortcuts(): Promise<Shortcut[]> {
  const { stdout } = await execFileAsync("/usr/bin/shortcuts", ["list", "--show-identifiers"]);
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseShortcutListRow)
    .filter((row): row is Required<ShortcutListRow> => Boolean(row?.name && row?.id))
    .map((row) => ({ id: row.id, name: row.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function parseShortcutListRow(line: string): ShortcutListRow | null {
  const match = line.match(/^(.*?)\s+\(([A-F0-9-]+)\)$/i);
  if (!match) {
    return null;
  }

  return {
    name: match[1].trim(),
    id: match[2].trim(),
  };
}

export async function runShortcut(nameOrIdentifier: string) {
  await execFileAsync("/usr/bin/shortcuts", ["run", nameOrIdentifier]);
}
