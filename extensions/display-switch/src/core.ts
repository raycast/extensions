export interface Display {
  id: string;
  name: string;
  enabled: boolean;
  builtIn: boolean;
  main: boolean;
  mirrored: boolean;
  width: number;
  height: number;
  warning?: string;
}

export function displayWarnings(displays: Display[]): string | undefined {
  return (
    displays
      .map((display) => display.warning)
      .filter(Boolean)
      .join("\n") || undefined
  );
}

// SkyLight's inventory is bounded at 128; each enable confirmation can take
// four seconds. Reads may wait behind that recovery lock.
export function helperTimeout(command: string): number {
  return command === "enable-all" || command === "list" ? 660_000 : 15_000;
}

export type Runner = (args: string[]) => Promise<string>;
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function parseDisplays(stdout: string): Display[] {
  const value: unknown = JSON.parse(stdout);
  if (!Array.isArray(value)) throw new Error("The display helper returned an invalid display list.");
  const ids = new Set<string>();
  for (const row of value) {
    if (
      !row ||
      typeof row !== "object" ||
      typeof row.id !== "string" ||
      !uuid.test(row.id) ||
      typeof row.name !== "string" ||
      !row.name ||
      (row.warning !== undefined && row.warning !== null && typeof row.warning !== "string") ||
      ["enabled", "builtIn", "main", "mirrored"].some((key) => typeof row[key] !== "boolean") ||
      ["width", "height"].some((key) => !Number.isFinite(row[key]) || row[key] < 0) ||
      ids.has(row.id.toLowerCase())
    )
      throw new Error("The display helper returned invalid or duplicate display data.");
    ids.add(row.id.toLowerCase());
  }
  return value as Display[];
}

export function resolveDisplay(displays: Display[], query: string): Display {
  const normalized = query.trim().toLowerCase();
  if (!normalized) throw new Error("Enter an exact display name or UUID.");
  const matches = displays.filter(
    (display) => display.id.toLowerCase() === normalized || display.name.toLowerCase() === normalized,
  );
  if (!matches.length) throw new Error("Display not found. Run Toggle Displays to see connected displays.");
  if (matches.length > 1) throw new Error("Several displays have that name. Use the UUID from Toggle Displays.");
  return matches[0];
}

export class DisplayController {
  constructor(private readonly run: Runner) {}
  async list(): Promise<Display[]> {
    return parseDisplays(await this.run(["list"]));
  }
  async set(id: string, state: boolean): Promise<Display[]> {
    if (!uuid.test(id)) throw new Error("Invalid display UUID.");
    // Refresh immediately before every change, including actions from a stale palette.
    const displays = await this.list();
    const display = displays.find((item) => item.id.toLowerCase() === id.toLowerCase());
    if (!display) throw new Error("Display disconnected. Refresh the list.");
    if (display.enabled === state) return displays;
    if (!state && !displays.some((item) => item.id !== display.id && item.enabled && !item.mirrored)) {
      throw new Error("The last active display cannot be turned off.");
    }
    if (!state && display.mirrored) throw new Error("Unmirror this display in System Settings first.");
    const result = parseDisplays(await this.run(["set", display.id, state ? "on" : "off"]));
    if (result.find((item) => item.id === display.id)?.enabled !== state) {
      throw new Error("The display change could not be verified. Try Enable All Displays.");
    }
    return result;
  }
  async toggle(query: string): Promise<Display[]> {
    const display = resolveDisplay(await this.list(), query);
    return this.set(display.id, !display.enabled);
  }
  async enableAll(): Promise<Display[]> {
    const result = parseDisplays(await this.run(["enable-all"]));
    if (result.some((display) => !display.enabled))
      throw new Error("Some displays are still off. Reconnect their cables and refresh.");
    return result;
  }
}
