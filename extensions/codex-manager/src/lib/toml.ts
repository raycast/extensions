import fs from "fs/promises";
import TOML from "@iarna/toml";
import path from "path";
import { atomicWrite, backupFile } from "@/lib/atomicWrite";
import { ensureDirExists } from "@/lib/paths";

export type TomlDocument = Record<string, unknown>;

export async function readTomlConfig(configPath: string): Promise<{ rawText: string; doc: TomlDocument }> {
  const rawText = await fs.readFile(configPath, "utf8");
  const doc = TOML.parse(rawText) as TomlDocument;
  return { rawText, doc };
}

export async function writeTomlConfig(configPath: string, doc: TomlDocument, createBackup: boolean): Promise<void> {
  const content = TOML.stringify(doc as TOML.JsonMap);
  if (createBackup) {
    await backupFile(configPath);
  }
  await ensureDirExists(path.dirname(configPath));
  await atomicWrite(configPath, content);
}
