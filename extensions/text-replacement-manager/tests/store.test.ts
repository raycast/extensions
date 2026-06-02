import {
  access,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

import { JsonMetadataStore } from "../src/lib/metadata-store";
import { SystemReplacementStore } from "../src/lib/system-store";
import type { CommandExecutor } from "../src/lib/shell";
import type { SystemReplacementItem } from "../src/lib/types";

describe("SystemReplacementStore", () => {
  it("creates a backup before writing and stores metadata only after a successful write", async () => {
    const dir = await mkdtemp(join(tmpdir(), "trm-test-"));
    const metadata = new JsonMetadataStore(join(dir, "metadata.json"));
    const calls: string[] = [];
    const written: string[] = [];
    const executor: CommandExecutor = async (command, args, options) => {
      calls.push(`${command} ${args.join(" ")}`);
      if (command === "defaults" && args[0] === "export") {
        await options?.writeFile(args[2], JSON.stringify({ NSUserDictionaryReplacementItems: [] }));
        return "";
      }
      if (command === "plutil" && args[0] === "-extract" && args[1] === "NSUserDictionaryReplacementItems") {
        const source = args.at(-1);
        if (!source) throw new Error("missing source");
        await options?.readFile(source);
        return "[]";
      }
      if (command === "defaults" && args[0] === "write") {
        written.push(args[3]);
        return "";
      }
      if (command === "killall") {
        return "";
      }
      return "";
    };

    try {
      const store = new SystemReplacementStore({ supportPath: dir, metadata, executor });
      await store.replaceAll([{ uuid: "uuid-omw", trigger: "omw", replacementText: "On my way!", tags: ["chat"], enabled: true }]);

      expect(calls.some((call) => call.startsWith("defaults export NSGlobalDomain"))).toBe(true);
      expect(calls.some((call) => call.startsWith("plutil -extract NSUserDictionaryReplacementItems json"))).toBe(true);
      expect(calls).toContain("killall AppleSpell");
      expect(calls).toContain("killall TextInputMenuAgent");
      expect(written).toEqual(['({ replace = "omw"; with = "On my way!"; on = 1; })']);
      expect(JSON.parse(await readFile(join(dir, "metadata.json"), "utf8"))).toEqual({
        omw: { uuid: "uuid-omw", tags: ["chat"] },
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("ignores text service refresh failures after a successful system write", async () => {
    const dir = await mkdtemp(join(tmpdir(), "trm-test-refresh-failure-"));
    const metadata = new JsonMetadataStore(join(dir, "metadata.json"));
    const killallCalls: string[] = [];
    const executor: CommandExecutor = async (command, args, options) => {
      if (command === "defaults" && args[0] === "export") {
        await options?.writeFile(args[2], JSON.stringify({ NSUserDictionaryReplacementItems: [] }));
        return "";
      }
      if (command === "plutil" && args[0] === "-extract") {
        return "[]";
      }
      if (command === "defaults" && args[0] === "write") {
        return "";
      }
      if (command === "killall") {
        killallCalls.push(args[0]);
        throw new Error(`${args[0]} not found`);
      }
      return "";
    };

    try {
      const store = new SystemReplacementStore({ supportPath: dir, metadata, executor });
      await expect(
        store.replaceAll([{ uuid: "uuid-brb", trigger: "brb", replacementText: "Be right back", tags: ["chat"], enabled: true }]),
      ).resolves.toBeUndefined();

      expect(killallCalls).toEqual(["AppleSpell", "TextInputMenuAgent"]);
      expect(JSON.parse(await readFile(join(dir, "metadata.json"), "utf8"))).toEqual({
        brb: { uuid: "uuid-brb", tags: ["chat"] },
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("syncs replacements to the KeyboardServices database when it exists", async () => {
    const dir = await mkdtemp(join(tmpdir(), "trm-test-keyboard-services-"));
    const metadata = new JsonMetadataStore(join(dir, "metadata.json"));
    const databasePath = join(dir, "TextReplacements.db");
    const sqliteCalls: string[] = [];
    await writeFile(databasePath, "", "utf8");

    const executor: CommandExecutor = async (command, args, options) => {
      if (command === "defaults" && args[0] === "export") {
        await options?.writeFile(args[2], JSON.stringify({ NSUserDictionaryReplacementItems: [] }));
        return "";
      }
      if (command === "plutil" && args[0] === "-extract") {
        return "[]";
      }
      if (command === "defaults" && args[0] === "write") {
        return "";
      }
      if (command === "sqlite3") {
        sqliteCalls.push(args.join("\n"));
        return "";
      }
      if (command === "killall") {
        return "";
      }
      return "";
    };

    try {
      const store = new SystemReplacementStore({ supportPath: dir, metadata, executor, keyboardServicesDatabasePath: databasePath });
      await store.replaceAll([{ uuid: "uuid-max", trigger: "_max", replacementText: "maxludden", tags: ["personal"], enabled: true }]);

      expect(sqliteCalls).toHaveLength(1);
      expect(sqliteCalls[0]).toContain(databasePath);
      expect(sqliteCalls[0]).toContain("ZTEXTREPLACEMENTENTRY");
      expect(sqliteCalls[0]).toContain("'_max'");
      expect(sqliteCalls[0]).toContain("'maxludden'");
      expect(sqliteCalls[0]).toMatch(/ZSHORTCUT NOT IN \('_max'\)/);
      expect(sqliteCalls[0]).toMatch(/ZWASDELETED = 0/);
      expect(JSON.parse(await readFile(join(dir, "metadata.json"), "utf8"))).toEqual({
        _max: { uuid: "uuid-max", tags: ["personal"] },
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("omits a NOT IN clause when syncing an empty KeyboardServices replacement list", async () => {
    const dir = await mkdtemp(join(tmpdir(), "trm-test-keyboard-services-empty-"));
    const metadata = new JsonMetadataStore(join(dir, "metadata.json"));
    const databasePath = join(dir, "TextReplacements.db");
    const sqliteCalls: string[] = [];
    await writeFile(databasePath, "", "utf8");

    const executor: CommandExecutor = async (command, args, options) => {
      if (command === "defaults" && args[0] === "export") {
        await options?.writeFile(args[2], JSON.stringify({ NSUserDictionaryReplacementItems: [] }));
        return "";
      }
      if (command === "plutil" && args[0] === "-extract") {
        return "[]";
      }
      if (command === "defaults" && args[0] === "write") {
        return "";
      }
      if (command === "sqlite3") {
        sqliteCalls.push(args.join("\n"));
        return "";
      }
      if (command === "killall") {
        return "";
      }
      return "";
    };

    try {
      const store = new SystemReplacementStore({ supportPath: dir, metadata, executor, keyboardServicesDatabasePath: databasePath });
      await store.replaceAll([]);

      expect(sqliteCalls).toHaveLength(1);
      expect(sqliteCalls[0]).toMatch(/UPDATE ZTEXTREPLACEMENTENTRY SET .*ZWASDELETED = 1/i);
      expect(sqliteCalls[0]).not.toMatch(/NOT IN\s*\(/i);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("marks disabled replacements as deleted in KeyboardServices SQL", async () => {
    const dir = await mkdtemp(join(tmpdir(), "trm-test-keyboard-services-disabled-"));
    const metadata = new JsonMetadataStore(join(dir, "metadata.json"));
    const databasePath = join(dir, "TextReplacements.db");
    const sqliteCalls: string[] = [];
    await writeFile(databasePath, "", "utf8");

    const executor: CommandExecutor = async (command, args, options) => {
      if (command === "defaults" && args[0] === "export") {
        await options?.writeFile(args[2], JSON.stringify({ NSUserDictionaryReplacementItems: [] }));
        return "";
      }
      if (command === "plutil" && args[0] === "-extract") {
        return "[]";
      }
      if (command === "defaults" && args[0] === "write") {
        return "";
      }
      if (command === "sqlite3") {
        sqliteCalls.push(args.join("\n"));
        return "";
      }
      if (command === "killall") {
        return "";
      }
      return "";
    };

    try {
      const store = new SystemReplacementStore({ supportPath: dir, metadata, executor, keyboardServicesDatabasePath: databasePath });
      await store.replaceAll([{ uuid: "uuid-off", trigger: "off", replacementText: "Off", tags: [], enabled: false }]);

      expect(sqliteCalls).toHaveLength(1);
      expect(sqliteCalls[0]).toContain("'off'");
      expect(sqliteCalls[0]).toMatch(/ZSHORTCUT = 'off'/);
      expect(sqliteCalls[0]).toMatch(/ZWASDELETED = 1/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not call sqlite3 or create database backups when the KeyboardServices database is missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "trm-test-keyboard-services-missing-"));
    const metadata = new JsonMetadataStore(join(dir, "metadata.json"));
    const databasePath = join(dir, "missing", "TextReplacements.db");
    const sqliteCalls: string[] = [];

    const executor: CommandExecutor = async (command, args, options) => {
      if (command === "defaults" && args[0] === "export") {
        await options?.writeFile(args[2], JSON.stringify({ NSUserDictionaryReplacementItems: [] }));
        return "";
      }
      if (command === "plutil" && args[0] === "-extract") {
        return "[]";
      }
      if (command === "defaults" && args[0] === "write") {
        return "";
      }
      if (command === "sqlite3") {
        sqliteCalls.push(args.join("\n"));
        return "";
      }
      if (command === "killall") {
        return "";
      }
      return "";
    };

    try {
      const store = new SystemReplacementStore({ supportPath: dir, metadata, executor, keyboardServicesDatabasePath: databasePath });
      await store.replaceAll([{ uuid: "uuid-max", trigger: "_max", replacementText: "maxludden", tags: ["personal"], enabled: true }]);

      expect(sqliteCalls).toEqual([]);
      await expect(access(join(dir, "backups", "TextReplacements.db"))).rejects.toBeDefined();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("creates KeyboardServices database backups before running sqlite3", async () => {
    const dir = await mkdtemp(join(tmpdir(), "trm-test-keyboard-services-backup-"));
    const metadata = new JsonMetadataStore(join(dir, "metadata.json"));
    const databasePath = join(dir, "TextReplacements.db");
    await writeFile(databasePath, "db", "utf8");
    await writeFile(`${databasePath}-wal`, "wal", "utf8");
    await writeFile(`${databasePath}-shm`, "shm", "utf8");

    const executor: CommandExecutor = async (command, args, options) => {
      if (command === "defaults" && args[0] === "export") {
        await options?.writeFile(args[2], JSON.stringify({ NSUserDictionaryReplacementItems: [] }));
        return "";
      }
      if (command === "plutil" && args[0] === "-extract") {
        return "[]";
      }
      if (command === "defaults" && args[0] === "write") {
        return "";
      }
      if (command === "sqlite3") {
        const backups = await readdir(join(dir, "backups"));
        expect(backups.some((fileName) => fileName.endsWith(".TextReplacements.db"))).toBe(true);
        expect(backups.some((fileName) => fileName.endsWith(".TextReplacements.db-wal"))).toBe(true);
        expect(backups.some((fileName) => fileName.endsWith(".TextReplacements.db-shm"))).toBe(true);
        return "";
      }
      if (command === "killall") {
        return "";
      }
      return "";
    };

    try {
      const store = new SystemReplacementStore({ supportPath: dir, metadata, executor, keyboardServicesDatabasePath: databasePath });
      await store.replaceAll([{ uuid: "uuid-max", trigger: "_max", replacementText: "maxludden", tags: ["personal"], enabled: true }]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("keeps only the 10 most recent KeyboardServices backup sets", async () => {
    const dir = await mkdtemp(join(tmpdir(), "trm-test-keyboard-backup-retention-"));
    const metadata = new JsonMetadataStore(join(dir, "metadata.json"));
    const databasePath = join(dir, "TextReplacements.db");
    const backupsPath = join(dir, "backups");
    await writeFile(databasePath, "current", "utf8");
    await writeFile(`${databasePath}-wal`, "wal", "utf8");
    await writeFile(`${databasePath}-shm`, "shm", "utf8");
    await mkdir(backupsPath, { recursive: true });

    for (let index = 0; index < 12; index += 1) {
      const stamp = `2026-05-22T10-00-${String(index).padStart(2, "0")}.000Z`;
      await writeFile(join(backupsPath, `${stamp}.TextReplacements.db`), "db", "utf8");
      await writeFile(join(backupsPath, `${stamp}.TextReplacements.db-wal`), "wal", "utf8");
      await writeFile(join(backupsPath, `${stamp}.TextReplacements.db-shm`), "shm", "utf8");
    }

    const executor: CommandExecutor = async (command, args, options) => {
      if (command === "defaults" && args[0] === "export") {
        await options?.writeFile(args[2], JSON.stringify({ NSUserDictionaryReplacementItems: [] }));
        return "";
      }
      if (command === "plutil" && args[0] === "-extract") {
        return "[]";
      }
      return "";
    };

    try {
      const store = new SystemReplacementStore({ supportPath: dir, metadata, executor, keyboardServicesDatabasePath: databasePath });
      await store.replaceAll([{ uuid: "uuid-max", trigger: "_max", replacementText: "maxludden", tags: ["personal"], enabled: true }]);

      const backupFiles = (await readdir(backupsPath))
        .filter((fileName) => fileName.includes(".TextReplacements.db"))
        .sort((a, b) => a.localeCompare(b));
      const dbBackups = backupFiles.filter((fileName) => fileName.endsWith(".TextReplacements.db"));

      expect(dbBackups).toHaveLength(10);
      expect(backupFiles).not.toContain("2026-05-22T10-00-00.000Z.TextReplacements.db");
      expect(backupFiles).not.toContain("2026-05-22T10-00-00.000Z.TextReplacements.db-wal");
      expect(backupFiles).not.toContain("2026-05-22T10-00-00.000Z.TextReplacements.db-shm");
      expect(backupFiles).not.toContain("2026-05-22T10-00-01.000Z.TextReplacements.db");
      expect(backupFiles).not.toContain("2026-05-22T10-00-01.000Z.TextReplacements.db-wal");
      expect(backupFiles).not.toContain("2026-05-22T10-00-01.000Z.TextReplacements.db-shm");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("treats a missing system replacement key as an empty list", async () => {
    const dir = await mkdtemp(join(tmpdir(), "trm-test-empty-"));
    const metadata = new JsonMetadataStore(join(dir, "metadata.json"));
    const executor: CommandExecutor = async (command, args, options) => {
      if (command === "defaults" && args[0] === "export") {
        await options?.writeFile(args[2], "{}");
        return "";
      }
      if (command === "plutil" && args[0] === "-extract") {
        throw new Error("Could not extract value, error: No value at that key path or invalid key path: NSUserDictionaryReplacementItems");
      }
      return "";
    };

    try {
      const store = new SystemReplacementStore({ supportPath: dir, metadata, executor });
      await expect(store.readAll()).resolves.toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
