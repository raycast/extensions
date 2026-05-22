import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
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
  keyboardServicesDatabasePath?: string;
}

export class SystemReplacementStore {
  private readonly metadata: MetadataStore;
  private readonly executor: CommandExecutor;
  private readonly keyboardServicesDatabasePath: string;

  constructor(private readonly options: SystemReplacementStoreOptions) {
    this.metadata =
      options.metadata ??
      new JsonMetadataStore(join(options.supportPath, "metadata.json"));
    this.executor = options.executor ?? defaultExecutor;
    this.keyboardServicesDatabasePath =
      options.keyboardServicesDatabasePath ??
      join(homedir(), "Library/KeyboardServices/TextReplacements.db");
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
    await this.syncKeyboardServicesDatabase(systemItems);
    await this.refreshTextServices();

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

  private async syncKeyboardServicesDatabase(
    items: SystemReplacementItem[],
  ): Promise<void> {
    if (!(await fileExists(this.keyboardServicesDatabasePath))) {
      return;
    }

    await this.createKeyboardServicesBackup();
    await this.executor("sqlite3", [
      this.keyboardServicesDatabasePath,
      toKeyboardServicesSyncSql(items),
    ]);
  }

  private async createKeyboardServicesBackup(): Promise<void> {
    const backupsPath = join(this.options.supportPath, "backups");
    await mkdir(backupsPath, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(":", "-");

    for (const suffix of ["", "-wal", "-shm"]) {
      const source = `${this.keyboardServicesDatabasePath}${suffix}`;
      if (await fileExists(source)) {
        await copyFile(
          source,
          join(backupsPath, `${stamp}.TextReplacements.db${suffix}`),
        );
      }
    }
  }

  private async refreshTextServices(): Promise<void> {
    await Promise.all(
      ["AppleSpell", "TextInputMenuAgent"].map(async (processName) => {
        try {
          await this.executor("killall", [processName]);
        } catch {
          // Best effort: a successful defaults write should not fail because
          // a text service process was not running or could not be restarted.
        }
      }),
    );
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function toKeyboardServicesSyncSql(items: SystemReplacementItem[]): string {
  const timestamp = Date.now() / 1000 - 978307200;
  const activeShortcuts = items.map((item) => sqlString(item.replace));
  const deleteMissing =
    activeShortcuts.length > 0
      ? `UPDATE ZTEXTREPLACEMENTENTRY SET ZNEEDSSAVETOCLOUD = 1, ZWASDELETED = 1, ZTIMESTAMP = ${timestamp} WHERE COALESCE(ZWASDELETED, 0) = 0 AND ZSHORTCUT NOT IN (${activeShortcuts.join(", ")});`
      : `UPDATE ZTEXTREPLACEMENTENTRY SET ZNEEDSSAVETOCLOUD = 1, ZWASDELETED = 1, ZTIMESTAMP = ${timestamp} WHERE COALESCE(ZWASDELETED, 0) = 0;`;

  return [
    "BEGIN IMMEDIATE;",
    ...items.flatMap((item) => upsertKeyboardServicesItemSql(item, timestamp)),
    deleteMissing,
    "UPDATE Z_PRIMARYKEY SET Z_MAX = (SELECT COALESCE(MAX(Z_PK), 0) FROM ZTEXTREPLACEMENTENTRY) WHERE Z_NAME = 'TextReplacementEntry';",
    "COMMIT;",
  ].join("\n");
}

function upsertKeyboardServicesItemSql(
  item: SystemReplacementItem,
  timestamp: number,
): string[] {
  const shortcut = sqlString(item.replace);
  const phrase = sqlString(item.with);
  const uniqueName = sqlString(randomUUID().toUpperCase());

  return [
    `UPDATE ZTEXTREPLACEMENTENTRY SET Z_OPT = COALESCE(Z_OPT, 0) + 1, ZNEEDSSAVETOCLOUD = 1, ZWASDELETED = ${item.on ? 0 : 1}, ZTIMESTAMP = ${timestamp}, ZPHRASE = ${phrase} WHERE COALESCE(ZWASDELETED, 0) = 0 AND ZSHORTCUT = ${shortcut};`,
    `INSERT INTO ZTEXTREPLACEMENTENTRY (Z_PK, Z_ENT, Z_OPT, ZNEEDSSAVETOCLOUD, ZWASDELETED, ZTIMESTAMP, ZPHRASE, ZSHORTCUT, ZUNIQUENAME, ZREMOTERECORDINFO) SELECT COALESCE((SELECT MAX(Z_PK) + 1 FROM ZTEXTREPLACEMENTENTRY), 1), 1, 1, 1, ${item.on ? 0 : 1}, ${timestamp}, ${phrase}, ${shortcut}, ${uniqueName}, NULL WHERE changes() = 0;`,
  ];
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function isMissingReplacementKeyError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("NSUserDictionaryReplacementItems")
  );
}
