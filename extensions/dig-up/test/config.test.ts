// engine/config.ts: defaults, a missing or broken file, normalization (DigUp AppSettings.folderURL and
// AppController.applyFolders), partial updates, and the atomic save.

import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import type { Config } from "../engine/api";
import {
  ConfigError,
  ConfigStore,
  DEFAULT_CONFIG,
  expandTilde,
  loadConfig,
  normalizeConfig,
  parsePatch,
  saveConfig,
} from "../engine/config";
import { silentLog, type Log } from "../engine/log";

const roots: string[] = [];
after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "digup-config-")));
  roots.push(dir);
  return dir;
}

function recordingLog(): Log & { lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    info: (m) => lines.push(`info ${m}`),
    warn: (m) => lines.push(`warn ${m}`),
    error: (m) => lines.push(`error ${m}`),
  };
}

const config = (over: Partial<Config> = {}): Config => ({ ...structuredClone(DEFAULT_CONFIG), ...over }) as Config;
const identity = { home: "/Users/me", resolve: (path: string) => path };

describe("defaults and the file", () => {
  it("has DigUp's defaults: nothing chosen, battery on, any hour, 60 s code quiet", () => {
    assert.deepEqual(DEFAULT_CONFIG, {
      folders: [],
      skipped: [],
      codeFolders: [],
      codeSkipped: [],
      excludedExtensions: [],
      indexOnBattery: true,
      indexHours: null,
      paused: false,
      codeQuietSeconds: 60,
      llamaServerPath: null,
      modelFolder: null,
    });
  });

  it("gives the defaults for a missing file, without writing one", () => {
    const dir = tempDir();
    const file = join(dir, "config.json");
    const log = recordingLog();
    assert.deepEqual(loadConfig(file, log), DEFAULT_CONFIG);
    assert.equal(existsSync(file), false);
    assert.deepEqual(log.lines, []);
  });

  it("keeps a broken file as config.json.broken, logs it, and starts from the defaults", () => {
    const dir = tempDir();
    const file = join(dir, "config.json");
    writeFileSync(file, '{"folders": ["/Users/me/Docs"');
    const log = recordingLog();
    assert.deepEqual(loadConfig(file, log), DEFAULT_CONFIG);
    assert.equal(readFileSync(`${file}.broken`, "utf8"), '{"folders": ["/Users/me/Docs"');
    assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), DEFAULT_CONFIG);
    assert.ok(log.lines.some((line) => line.startsWith("warn") && line.includes("broken")));
  });

  it("treats JSON that isn't an object as broken", () => {
    const dir = tempDir();
    const file = join(dir, "config.json");
    writeFileSync(file, "[1, 2]");
    assert.deepEqual(loadConfig(file, silentLog), DEFAULT_CONFIG);
    assert.ok(existsSync(`${file}.broken`));
  });

  it("fills what a file leaves out with the defaults, and replaces values of the wrong type (logged)", () => {
    const dir = tempDir();
    const docs = join(dir, "Docs");
    mkdirSync(docs);
    const file = join(dir, "config.json");
    writeFileSync(file, JSON.stringify({ folders: [docs], paused: "yes", codeQuietSeconds: 5, future: { a: 1 } }));
    const log = recordingLog();
    const loaded = loadConfig(file, log);
    assert.deepEqual(loaded.folders, [docs]);
    assert.equal(loaded.paused, false);
    assert.equal(loaded.codeQuietSeconds, 5);
    assert.equal(loaded.indexOnBattery, true);
    // A setting a newer build added is kept as it is.
    assert.deepEqual((loaded as unknown as Record<string, unknown>).future, { a: 1 });
    assert.ok(log.lines.some((line) => line.includes("paused must be true or false")));
  });

  it("leaves out a relative folder in a hand-edited file and keeps the rest", () => {
    const dir = tempDir();
    const file = join(dir, "config.json");
    writeFileSync(file, JSON.stringify({ folders: ["Documents", dir] }));
    const log = recordingLog();
    assert.deepEqual(loadConfig(file, log).folders, [dir]);
    assert.ok(log.lines.some((line) => line.includes("“Documents” isn't a full path")));
  });
});

describe("normalizeConfig", () => {
  it("expands ~, trims spaces and trailing slashes", () => {
    assert.equal(expandTilde("~", "/Users/me"), "/Users/me");
    assert.equal(expandTilde(" ~/Documents/ ", "/Users/me"), "/Users/me/Documents");
    assert.equal(expandTilde("/", "/Users/me"), "/");
    assert.equal(expandTilde("~other/x", "/Users/me"), "~other/x");
    const out = normalizeConfig(config({ folders: ["~/Documents/", "~/Desktop"] }), identity);
    assert.deepEqual(out.folders, ["/Users/me/Documents", "/Users/me/Desktop"]);
  });

  it("resolves symlinks, as DigUp's folderURL does, and keeps a folder that isn't there as given", () => {
    const dir = tempDir();
    const real = join(dir, "real");
    mkdirSync(real);
    symlinkSync(real, join(dir, "link"));
    const out = normalizeConfig(config({ folders: [join(dir, "link"), join(dir, "unplugged")] }));
    assert.deepEqual(out.folders, [real, join(dir, "unplugged")]);
  });

  it("spells /var and /tmp as the file system does (/private/...)", () => {
    const out = normalizeConfig(config({ folders: ["/tmp"] }));
    assert.deepEqual(out.folders, ["/private/tmp"]);
  });

  it("drops repeats, blanks and folders another chosen folder already searches whole", () => {
    const out = normalizeConfig(
      config({ folders: ["/a/Docs", "", "/a/Docs/", "/a/Docs/Work", "/a/Pictures", "/a/Docs Old"] }),
      identity,
    );
    assert.deepEqual(out.folders, ["/a/Docs", "/a/Pictures", "/a/Docs Old"]);
  });

  it("keeps a chosen folder inside a skipped one, and drops a skip with nothing around it", () => {
    const out = normalizeConfig(
      config({
        folders: ["/a/Downloads", "/a/Downloads/Media/Courses"],
        skipped: ["/a/Downloads/Media", "/b/elsewhere"],
      }),
      identity,
    );
    assert.deepEqual(out.folders, ["/a/Downloads", "/a/Downloads/Media/Courses"]);
    assert.deepEqual(out.skipped, ["/a/Downloads/Media"]);
  });

  it("compares folder names by canonical equivalence (NFC and NFD are one folder)", () => {
    const nfc = "/a/Žádosti".normalize("NFC");
    const nfd = "/a/Žádosti".normalize("NFD");
    assert.deepEqual(normalizeConfig(config({ folders: [nfc, nfd] }), identity).folders, [nfc]);
  });

  it("applies the same rule to the code folders", () => {
    const out = normalizeConfig(
      config({ codeFolders: ["/c/src", "/c/src/app", "/c/lib"], codeSkipped: ["/c/src/gen", "/x"] }),
      identity,
    );
    assert.deepEqual(out.codeFolders, ["/c/src", "/c/lib"]);
    assert.deepEqual(out.codeSkipped, ["/c/src/gen"]);
  });

  it("reads skipped types as DigUp does: lowercase, no dot or star, each once, sorted", () => {
    const out = normalizeConfig(config({ excludedExtensions: ["HEIC", ".txt *.md", "txt", ""] }), identity);
    assert.deepEqual(out.excludedExtensions, ["heic", "md", "txt"]);
  });

  it("keeps codeQuietSeconds at 1 or more, and takes start = end as any hour", () => {
    assert.equal(normalizeConfig(config({ codeQuietSeconds: 0 }), identity).codeQuietSeconds, 1);
    assert.equal(normalizeConfig(config({ indexHours: { start: 5, end: 5 } }), identity).indexHours, null);
    assert.deepEqual(normalizeConfig(config({ indexHours: { start: 22, end: 7 } }), identity).indexHours, {
      start: 22,
      end: 7,
    });
  });

  it("expands ~ in the llama-server and model folder overrides; empty is none", () => {
    const out = normalizeConfig(config({ llamaServerPath: "~/bin/llama-server", modelFolder: " " }), identity);
    assert.equal(out.llamaServerPath, "/Users/me/bin/llama-server");
    assert.equal(out.modelFolder, null);
  });

  it("refuses a relative folder", () => {
    assert.throws(() => normalizeConfig(config({ folders: ["Documents"] }), identity), ConfigError);
  });
});

describe("parsePatch", () => {
  it("takes a partial body and turns 24 into midnight", () => {
    assert.deepEqual(parsePatch({ indexOnBattery: false }), { indexOnBattery: false });
    assert.deepEqual(parsePatch({ indexHours: { start: 22, end: 24 } }), { indexHours: { start: 22, end: 0 } });
    assert.deepEqual(parsePatch({ indexHours: null }), { indexHours: null });
  });

  it("refuses values of the wrong type with a 400", () => {
    const bad: unknown[] = [
      null,
      [],
      "x",
      { folders: "/a" },
      { folders: [1] },
      { paused: 1 },
      { indexHours: { start: 25, end: 1 } },
      { indexHours: { start: 1.5, end: 3 } },
      { codeQuietSeconds: "60" },
      { codeQuietSeconds: Number.NaN },
      { llamaServerPath: 3 },
    ];
    for (const body of bad) {
      assert.throws(
        () => parsePatch(body),
        (error: unknown) => error instanceof ConfigError && error.status === 400,
        JSON.stringify(body),
      );
    }
  });
});

describe("ConfigStore", () => {
  it("merges partial updates, saves every one, and tells listeners only what changed", () => {
    const dir = tempDir();
    const docs = join(dir, "Docs");
    const work = join(docs, "Work");
    mkdirSync(work, { recursive: true });
    const file = join(dir, "config.json");
    const store = new ConfigStore(file, silentLog);
    const heard: Array<{ changed: string[]; folders: string[]; before: string[] }> = [];
    store.onChange((next, previous, changed) =>
      heard.push({ changed: [...changed].sort(), folders: next.folders, before: previous.folders }),
    );

    // The file exists from the first POST /config, even one that changes nothing.
    const first = store.update({ indexOnBattery: true });
    assert.equal(first.changed.size, 0);
    assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), DEFAULT_CONFIG);
    assert.equal(heard.length, 0);

    store.update({ folders: [docs, work, `${docs}/`] });
    assert.deepEqual(heard, [{ changed: ["folders"], folders: [docs], before: [] }]);
    assert.deepEqual(JSON.parse(readFileSync(file, "utf8")).folders, [docs]);

    const next = store.update({ paused: true, indexHours: { start: 1, end: 7 } });
    assert.deepEqual(next.config.folders, [docs], "a partial body keeps the other settings");
    assert.deepEqual(heard.at(-1)?.changed, ["indexHours", "paused"]);

    // A new store reads back the same settings: the menu bar reads this file with no daemon running.
    assert.deepEqual(new ConfigStore(file, silentLog).get(), next.config);
  });

  it("hands out copies", () => {
    const store = new ConfigStore(join(tempDir(), "config.json"), silentLog);
    store.get().folders.push("/x");
    assert.deepEqual(store.get().folders, []);
  });

  it("refuses a bad body without changing or saving anything", () => {
    const dir = tempDir();
    const file = join(dir, "config.json");
    const store = new ConfigStore(file, silentLog);
    assert.throws(() => store.update({ paused: "no" }), ConfigError);
    assert.throws(() => store.update({ folders: ["relative/path"] }), ConfigError);
    assert.equal(existsSync(file), false);
    assert.deepEqual(store.get(), DEFAULT_CONFIG);
  });

  it("replaces the file by rename (a reader never sees half of it) and leaves no temporary file", () => {
    const dir = tempDir();
    const file = join(dir, "config.json");
    saveConfig(file, config({ paused: true }));
    const before = statSync(file).ino;
    saveConfig(file, config({ paused: false }));
    assert.notEqual(statSync(file).ino, before, "a new file took the old one's name");
    assert.deepEqual(readdirSync(dir), ["config.json"]);
    assert.equal(JSON.parse(readFileSync(file, "utf8")).paused, false);
  });

  it("keeps the old settings when the file can't be written", { skip: process.getuid?.() === 0 }, () => {
    const dir = tempDir();
    const sub = join(dir, "locked");
    mkdirSync(sub);
    const file = join(sub, "config.json");
    const store = new ConfigStore(file, silentLog);
    store.update({ paused: true });
    chmodSync(sub, 0o500);
    try {
      assert.throws(() => store.update({ paused: false }), /EACCES/);
      assert.equal(store.get().paused, true);
      assert.equal(JSON.parse(readFileSync(file, "utf8")).paused, true);
    } finally {
      chmodSync(sub, 0o700);
    }
  });

  it("keeps a listener's failure from undoing the change", () => {
    const log = recordingLog();
    const store = new ConfigStore(join(tempDir(), "config.json"), log);
    store.onChange(() => {
      throw new Error("listener broke");
    });
    assert.equal(store.update({ paused: true }).config.paused, true);
    assert.ok(log.lines.some((line) => line.startsWith("error") && line.includes("listener broke")));
  });
});
