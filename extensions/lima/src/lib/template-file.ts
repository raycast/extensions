import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { parse } from "yaml";
import { NAME_PATTERN } from "./lima";

/** What the extension shows of a manifest (a lima.yaml of your own). Lima reads the file itself when it creates. */
export interface TemplateFile {
  /** From the file name, when it makes a valid instance name. */
  name?: string;
  cpus?: number;
  /** GiB. */
  memory?: number;
  /** GiB. */
  disk?: number;
  vmType?: string;
  /** What the file builds on, like `template:default`. */
  base: string[];
  /** The modes of the file's own provision scripts, in order. */
  provisions: string[];
  /** Host folders the file mounts, as written (`~` stays). */
  mounts: { location: string; writable: boolean }[];
  /** Guest port → host port. */
  ports: { guest: number; host: number }[];
  /** Lima disks (volumes) it attaches, by name. */
  volumes: string[];
}

/** Lima's size units, in GiB. A bare number is bytes. */
const UNITS: Record<string, number> = {
  "": 1 / 1024 ** 3,
  b: 1 / 1024 ** 3,
  k: 1 / 1024 ** 2,
  kb: 1e3 / 1024 ** 3,
  kib: 1 / 1024 ** 2,
  m: 1 / 1024,
  mb: 1e6 / 1024 ** 3,
  mib: 1 / 1024,
  g: 1,
  gb: 1e9 / 1024 ** 3,
  gib: 1,
  t: 1024,
  tb: 1e12 / 1024 ** 3,
  tib: 1024,
};

/** "6GiB" → 6, "512MiB" → 0.5. Undefined for anything else, so the form keeps the file's own value. */
export function toGiB(value: unknown): number | undefined {
  if (typeof value === "number") return round(value * UNITS[""]);
  if (typeof value !== "string") return undefined;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*([a-z]*)$/i);
  const unit = match && UNITS[match[2].toLowerCase()];
  return match && unit ? round(Number(match[1]) * unit) : undefined;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function asStrings(value: unknown): string[] {
  const list = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
  return list.flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    if (entry && typeof entry === "object" && "url" in entry && typeof entry.url === "string") return [entry.url];
    return [];
  });
}

/** The mappings in a YAML list, skipping anything else. */
function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
    : [];
}

export function isTemplateFile(path: string): boolean {
  return [".yaml", ".yml"].includes(extname(path).toLowerCase());
}

export async function readTemplateFile(path: string): Promise<TemplateFile> {
  let data: unknown;
  try {
    data = parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`Couldn't read it as YAML: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("It isn't a Lima template.");
  const template = data as Record<string, unknown>;
  const stem = basename(path, extname(path));
  const provisions = Array.isArray(template.provision) ? template.provision : [];
  return {
    name: NAME_PATTERN.test(stem) ? stem : undefined,
    cpus: typeof template.cpus === "number" ? template.cpus : undefined,
    memory: toGiB(template.memory),
    disk: toGiB(template.disk),
    vmType: typeof template.vmType === "string" ? template.vmType : undefined,
    base: asStrings(template.base),
    provisions: provisions.map((entry) => (entry && typeof entry.mode === "string" ? entry.mode : "system")),
    mounts: list(template.mounts).flatMap((entry) =>
      typeof entry.location === "string" ? [{ location: entry.location, writable: entry.writable === true }] : [],
    ),
    volumes: (Array.isArray(template.additionalDisks) ? template.additionalDisks : []).flatMap((entry) =>
      typeof entry === "string" ? [entry] : entry && typeof entry.name === "string" ? [entry.name] : [],
    ),
    ports: list(template.portForwards).flatMap((entry) =>
      typeof entry.guestPort === "number"
        ? [{ guest: entry.guestPort, host: typeof entry.hostPort === "number" ? entry.hostPort : entry.guestPort }]
        : [],
    ),
  };
}
