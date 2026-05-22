import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
        throw new Error(`${args[0]} not found`);
      }
      return "";
    };

    try {
      const store = new SystemReplacementStore({ supportPath: dir, metadata, executor });
      await expect(
        store.replaceAll([{ uuid: "uuid-brb", trigger: "brb", replacementText: "Be right back", tags: ["chat"], enabled: true }]),
      ).resolves.toBeUndefined();

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
      expect(JSON.parse(await readFile(join(dir, "metadata.json"), "utf8"))).toEqual({
        _max: { uuid: "uuid-max", tags: ["personal"] },
      });
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
