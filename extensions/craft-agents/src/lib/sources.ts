import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { logger } from "./logger";
import { sourcesDir } from "./workspace";

const MAX_CONFIG_BYTES = 1 * 1024 * 1024; // 1 MB

export const SourceConfigSchema = z
  .object({
    name: z.string().optional(),
    provider: z.string().optional(),
    type: z.string().optional(),
    icon: z.string().optional(),
    description: z.string().optional(),
    active: z.boolean().optional(),
  })
  .passthrough();
export type SourceConfig = z.infer<typeof SourceConfigSchema>;

export interface SourceRecord {
  slug: string;
  displayName: string;
  provider?: string;
  type?: string;
  description?: string;
  active: boolean;
}

function readCapped(filePath: string): string | null {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_CONFIG_BYTES) {
      logger.warn("sources.config_too_large", { filePath, size: stat.size });
      return null;
    }
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    logger.debug("sources.read_failed", { filePath, err: String(err) });
    return null;
  }
}

export function listSources(workspaceRoot: string): SourceRecord[] {
  const dir = sourcesDir(workspaceRoot);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    logger.warn("sources.readdir_failed", { dir, err: String(err) });
    return [];
  }
  const records: SourceRecord[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const configPath = path.join(dir, slug, "config.json");
    const raw = readCapped(configPath);
    if (!raw) {
      records.push({ slug, displayName: slug, active: true });
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      logger.warn("sources.parse_failed", { slug, err: String(err) });
      records.push({ slug, displayName: slug, active: true });
      continue;
    }
    const result = SourceConfigSchema.safeParse(parsed);
    if (!result.success) {
      records.push({ slug, displayName: slug, active: true });
      continue;
    }
    const c = result.data;
    records.push({
      slug,
      displayName: c.name ?? slug,
      provider: c.provider,
      type: c.type,
      description: c.description,
      active: c.active ?? true,
    });
  }
  records.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return records;
}
