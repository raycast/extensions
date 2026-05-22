import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { JsonMetadataStore, type MetadataStore } from "./metadata-store";
import {
  defaultExecutor,
  defaultExecutorOptions,
  type CommandExecutor,
} from "./shell";
import {
  mergeSystemWithMetadata,
  metadataFromReplacements,
  serializeSystemItems,
  toDefaultsWriteValue,
} from "./system-replacements";
import type { SystemReplacementItem, TextReplacement } from "./types";

interface SystemReplacementStoreOptions {
  supportPath: string;
  metadata?: MetadataStore;
  executor?: CommandExecutor;
}

export class SystemReplacementStore {
  private readonly metadata: MetadataStore;
  private readonly executor: CommandExecutor;

  constructor(private readonly options: SystemReplacementStoreOptions) {
    this.metadata =
      options.metadata ??
      new JsonMetadataStore(join(options.supportPath, "metadata.json"));
    this.executor = options.executor ?? defaultExecutor;
  }

  async readAll(): Promise<TextReplacement[]> {
    const [items, metadata] = await Promise.all([
      this.readSystemItems(),
      this.metadata.read(),
    ]);
    return mergeSystemWithMetadata(items, metadata);
  }

  async replaceAll(replacements: TextReplacement[]): Promise<void> {
    const current = await this.readSystemItems();
    await this.createBackup(current);

    const systemItems = serializeSystemItems(replacements);
    await this.executor("defaults", [
      "write",
      "NSGlobalDomain",
      "NSUserDictionaryReplacementItems",
      toDefaultsWriteValue(systemItems),
    ]);

    await this.metadata.write(metadataFromReplacements(replacements));
  }

  async create(input: TextReplacement): Promise<void> {
    const items = await this.readAll();
    await this.replaceAll([...items, input]);
  }

  async update(updated: TextReplacement): Promise<void> {
    const items = await this.readAll();
    await this.replaceAll(
      items.map((item) => (item.uuid === updated.uuid ? updated : item)),
    );
  }

  async delete(uuid: string): Promise<void> {
    const items = await this.readAll();
    await this.replaceAll(items.filter((item) => item.uuid !== uuid));
  }

  async importMany(imported: TextReplacement[]): Promise<void> {
    const items = await this.readAll();
    await this.replaceAll([...items, ...imported]);
  }

  private async readSystemItems(): Promise<SystemReplacementItem[]> {
    const directory = await mkdtemp(join(tmpdir(), "trm-domain-"));
    const plistPath = join(directory, "GlobalPreferences.plist");

    try {
      await this.executor(
        "defaults",
        ["export", "NSGlobalDomain", plistPath],
        defaultExecutorOptions,
      );
      const json = await this.extractReplacementItems(plistPath);
      return JSON.parse(json) as SystemReplacementItem[];
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  private async extractReplacementItems(plistPath: string): Promise<string> {
    try {
      return await this.executor(
        "plutil",
        [
          "-extract",
          "NSUserDictionaryReplacementItems",
          "json",
          "-o",
          "-",
          plistPath,
        ],
        defaultExecutorOptions,
      );
    } catch (error) {
      if (isMissingReplacementKeyError(error)) {
        return "[]";
      }
      throw error;
    }
  }

  private async createBackup(items: SystemReplacementItem[]): Promise<void> {
    const backupsPath = join(this.options.supportPath, "backups");
    await mkdir(backupsPath, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(":", "-");
    await writeFile(
      join(backupsPath, `${stamp}.json`),
      `${JSON.stringify(items, null, 2)}\n`,
      "utf8",
    );
  }
}

function isMissingReplacementKeyError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("NSUserDictionaryReplacementItems")
  );
}
