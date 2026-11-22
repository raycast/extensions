import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OrcaCliError } from "../src/lib/orca-cli";
import {
  type Bot,
  extractSessionId,
  launchArgs,
  parseBotList,
  readBotFolders,
  readBotFromFolder,
  sortBots,
} from "../src/lib/bots";

const makeBot = (overrides: Partial<Bot>): Bot => ({
  id: "id",
  name: "Bot",
  harness: "claude",
  specialty: "",
  paused: false,
  folder: "/h/.orca/bots/bot",
  ...overrides,
});

describe("readBotFromFolder", () => {
  const writeBot = (content: string): string => {
    const folder = mkdtempSync(join(tmpdir(), "orca-default-bot-"));
    writeFileSync(join(folder, "bot.json"), content);
    return folder;
  };

  test("reads id, name and agent from bot.json, ignoring a trailing slash", () => {
    const folder = writeBot(JSON.stringify({ id: "id-x", name: "Architect", agent: "claude", avatar: "mascot:J1" }));
    expect(readBotFromFolder(`${folder}/`)).toEqual({
      id: "id-x",
      name: "Architect",
      harness: "claude",
      specialty: "",
      paused: false,
      folder,
    });
  });

  test("the bot it returns builds the probed launch command", () => {
    const folder = writeBot(JSON.stringify({ id: "id-x", name: "test", agent: "claude" }));
    const bot = readBotFromFolder(folder);
    expect(bot).not.toBeNull();
    expect(launchArgs(bot as Bot, "salut")).toContain(`path:${folder}`);
  });

  test("returns null for a folder that is not a usable bot", () => {
    expect(readBotFromFolder(mkdtempSync(join(tmpdir(), "orca-empty-")))).toBeNull();
    expect(readBotFromFolder(writeBot("{not json"))).toBeNull();
    expect(readBotFromFolder(writeBot(JSON.stringify({ id: "id-x", name: "x" })))).toBeNull();
    expect(readBotFromFolder(writeBot(JSON.stringify({ name: "x", agent: "claude" })))).toBeNull();
  });

  test("falls back to the id when bot.json has no name", () => {
    const folder = writeBot(JSON.stringify({ id: "id-x", agent: "grok" }));
    expect(readBotFromFolder(folder)?.name).toBe("id-x");
  });
});

describe("readBotFolders", () => {
  test("readBotFolders maps bot.json id to folder", () => {
    const tmp = mkdtempSync(join(tmpdir(), "orca-bots-"));
    mkdirSync(join(tmp, "a"));
    writeFileSync(join(tmp, "a", "bot.json"), JSON.stringify({ id: "id-a" }));
    mkdirSync(join(tmp, "b"));
    writeFileSync(join(tmp, "b", "bot.json"), "{ not json");
    mkdirSync(join(tmp, "c"));

    const folders = readBotFolders(tmp);
    expect(folders.size).toBe(1);
    expect(folders.get("id-a")).toBe(join(tmp, "a"));
  });

  test("readBotFolders returns an empty map when the directory does not exist", () => {
    expect(readBotFolders(join(tmpdir(), "orca-bots-does-not-exist-xyz")).size).toBe(0);
  });

  test("readBotFolders ignores a bot.json without a string id", () => {
    const tmp = mkdtempSync(join(tmpdir(), "orca-bots-"));
    mkdirSync(join(tmp, "a"));
    writeFileSync(join(tmp, "a", "bot.json"), JSON.stringify({ id: 42 }));
    mkdirSync(join(tmp, "b"));
    writeFileSync(join(tmp, "b", "bot.json"), "null");
    expect(readBotFolders(tmp).size).toBe(0);
  });
});

describe("parseBotList", () => {
  test("parseBotList keeps all fields and resolves folders", () => {
    const envelope = JSON.parse(readFileSync(join(__dirname, "fixtures", "bot-list.json"), "utf8"));
    const folders = new Map([["b4201eff-cb3e-45fe-ae11-f29318e646f5", "/h/.orca/bots/helper"]]);

    const bots = parseBotList(envelope.result, folders);
    expect(bots).toHaveLength(4);

    const helper = bots.find((bot) => bot.name === "helper");
    expect(helper?.folder).toBe("/h/.orca/bots/helper");
    expect(helper?.harness).toBe("claude");
    expect(helper?.paused).toBe(false);
    expect(helper?.specialty).toBe("General workspace assistant");

    const reviewer = bots.find((bot) => bot.name === "Reviewer");
    expect(reviewer?.harness).toBe("grok");
    expect(reviewer?.folder).toBeNull();
  });

  test("parseBotList tolerates unexpected shapes", () => {
    for (const value of [null, undefined, 42, "x", {}, { bots: null }, { bots: [null, 1, {}] }]) {
      expect(parseBotList(value, new Map())).toEqual([]);
    }
  });
});

describe("sortBots", () => {
  test("sortBots puts last used first then paused last", () => {
    const a = makeBot({ id: "a", name: "A" });
    const b = makeBot({ id: "b", name: "B", paused: true });
    const c = makeBot({ id: "c", name: "C" });
    expect(sortBots([b, a, c], "c").map((bot) => bot.id)).toEqual(["c", "a", "b"]);
  });

  test("sortBots orders alphabetically without a last used bot and does not mutate its input", () => {
    const input = [
      makeBot({ id: "z", name: "Zoé" }),
      makeBot({ id: "e", name: "Émile" }),
      makeBot({ id: "a", name: "Alice" }),
    ];
    const snapshot = input.map((bot) => bot.id);
    expect(sortBots(input).map((bot) => bot.id)).toEqual(["a", "e", "z"]);
    expect(input.map((bot) => bot.id)).toEqual(snapshot);
  });

  test("sortBots puts the default bot before the last used one", () => {
    const a = makeBot({ id: "a", name: "A" });
    const b = makeBot({ id: "b", name: "B" });
    const c = makeBot({ id: "c", name: "C" });
    expect(sortBots([a, b, c], "b", "c").map((bot) => bot.id)).toEqual(["c", "b", "a"]);
  });

  test("sortBots keeps a paused last used bot first", () => {
    const a = makeBot({ id: "a", name: "A" });
    const b = makeBot({ id: "b", name: "B", paused: true });
    expect(sortBots([a, b], "b").map((bot) => bot.id)).toEqual(["b", "a"]);
  });
});

describe("launchArgs", () => {
  test("launchArgs builds the probed command", () => {
    const bot = makeBot({ harness: "claude", folder: "/h/.orca/bots/test" });
    expect(launchArgs(bot, "Réponds juste: pong")).toEqual([
      "agent",
      "launch",
      "--agent",
      "claude",
      "--worktree",
      "path:/h/.orca/bots/test",
      "--surface",
      "chat",
      "--prompt=Réponds juste: pong",
    ]);
  });

  // Le parseur d'Orca prend le jeton suivant `--prompt` pour un flag s'il commence par `--` :
  // seule la forme `--prompt=<valeur>` en un seul argument est sûre.
  test("launchArgs keeps a prompt starting with -- in a single --prompt= argument", () => {
    const prompt = "---\ntitle: x\n---";
    const args = launchArgs(makeBot({}), prompt);
    expect(args.at(-1)).toBe(`--prompt=${prompt}`);
    expect(args).not.toContain("--prompt");
    expect(args).not.toContain(prompt);
  });

  test("launchArgs keeps equals signs of the prompt intact", () => {
    expect(launchArgs(makeBot({}), "a=b").at(-1)).toBe("--prompt=a=b");
  });

  test("launchArgs never includes --focus", () => {
    expect(launchArgs(makeBot({}), "x")).not.toContain("--focus");
  });

  test("launchArgs refuses a bot without a resolved folder", () => {
    const bot = makeBot({ folder: null });
    let caught: unknown;
    try {
      launchArgs(bot, "hello");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(OrcaCliError);
    expect((caught as OrcaCliError).code).toBe("bot_folder_missing");
    expect((caught as OrcaCliError).message.length).toBeGreaterThan(0);
  });
});

describe("extractSessionId", () => {
  test("extractSessionId reads outcome.sessionId from the captured launch", () => {
    const envelope = JSON.parse(readFileSync(join(__dirname, "fixtures", "agent-launch.json"), "utf8"));
    expect(extractSessionId(envelope.result)).toBe("d9359b2d-b91a-4794-8475-6948bcd54004");
  });

  // Fixture synthétique : repli terminal, `outcome` sans `sessionId`.
  test("extractSessionId returns null for a terminal fallback or unexpected shapes", () => {
    expect(extractSessionId({ outcome: { kind: "terminal", handle: "term_1" } })).toBeNull();
    for (const value of [null, undefined, 42, "x", {}, { outcome: null }, { outcome: { sessionId: "" } }]) {
      expect(extractSessionId(value)).toBeNull();
    }
  });
});
