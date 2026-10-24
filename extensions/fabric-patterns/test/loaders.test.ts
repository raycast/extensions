import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  listNames,
  loadPatterns,
  loadSessions,
  parseExplanations,
  parseList,
  profileKey,
  readStrategy,
} from "../lib/loaders";
import { profileYaml } from "../lib/writers";

const FAKE = join(import.meta.dir, "fake-fabric.sh");
const FIXTURES = join(import.meta.dir, "fixtures");
const tmp = mkdtempSync(join(tmpdir(), "fabric-loaders-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const fixtureLines = (f: string) => readFileSync(join(FIXTURES, f), "utf8").split("\n").filter(Boolean);

describe("parsing", () => {
  test("parseList drops blanks and trims", () => {
    expect(parseList("a\n\n b \n")).toEqual(["a", "b"]);
  });

  test("parseExplanations reads the numbered **name**: text lines", () => {
    const m = parseExplanations(
      "# heading\n\n- Key pattern to use: **suggest_pattern**, suggests.\n\n1. **agility_story**: Generate a user story.\n2. **ai**: Interpret questions.\n",
    );
    expect(m.get("agility_story")).toBe("Generate a user story.");
    expect(m.get("ai")).toBe("Interpret questions.");
    expect(m.has("suggest_pattern")).toBe(false);
  });
});

describe("ISC-10: the search lists every pattern fabric lists", () => {
  const patternsDir = join(tmp, "patterns");
  const myDir = join(tmp, "custom");
  mkdirSync(join(patternsDir, "summarize"), { recursive: true });
  writeFileSync(join(patternsDir, "pattern_explanations.md"), "1. **summarize**: Summarize content.\n");
  mkdirSync(join(patternsDir, "translate"), { recursive: true });
  writeFileSync(
    join(patternsDir, "translate", "system.md"),
    "# IDENTITY and PURPOSE\n\nYou translate text into {{lang_code}}.\n",
  );
  mkdirSync(join(myDir, "extract_wisdom"), { recursive: true });

  test("count and names match the fabric list", async () => {
    const ps = await loadPatterns(FAKE, { patternsDir, myPatternsDir: myDir });
    expect(ps.map((p) => p.name)).toEqual(fixtureLines("patterns.txt"));
  });

  test("descriptions come from explanations, else system.md's first prose line", async () => {
    const ps = await loadPatterns(FAKE, { patternsDir, myPatternsDir: myDir });
    expect(ps.find((p) => p.name === "summarize")?.description).toBe("Summarize content.");
    expect(ps.find((p) => p.name === "translate")?.description).toBe("You translate text into {{lang_code}}.");
  });

  test("patterns in My patterns are marked as own", async () => {
    const ps = await loadPatterns(FAKE, { patternsDir, myPatternsDir: myDir });
    expect(ps.filter((p) => p.own).map((p) => p.name)).toEqual(["extract_wisdom"]);
  });

  test("a failing fabric list throws with its stderr", async () => {
    const failing = join(tmp, "failing-fabric");
    writeFileSync(failing, "#!/bin/sh\necho boom >&2\nexit 1\n", { mode: 0o755 });
    await expect(loadPatterns(failing, { patternsDir, myPatternsDir: myDir })).rejects.toThrow(/boom/);
  });
});

describe("a custom pattern that shadows a built-in is marked so", () => {
  test("shadows is set only where both folders hold the name", async () => {
    const root = join(tmp, "shadow-flag");
    for (const [d, n] of [
      ["patterns", "summarize"],
      ["patterns", "translate"],
      ["custom", "summarize"],
      ["custom", "extract_wisdom"],
    ])
      mkdirSync(join(root, d, n), { recursive: true });
    const ps = await loadPatterns(FAKE, { patternsDir: join(root, "patterns"), myPatternsDir: join(root, "custom") });
    expect(ps.filter((p) => p.shadows).map((p) => p.name)).toEqual(["summarize"]);
    expect(ps.filter((p) => p.own).map((p) => p.name)).toEqual(["extract_wisdom", "summarize"]);
  });
});

describe("ISC-10.1: the search lists saved sessions", () => {
  test("names match the fabric list, with message counts from the JSON", async () => {
    const sessionsDir = join(tmp, "sessions");
    mkdirSync(sessionsDir, { recursive: true });
    writeFileSync(
      join(sessionsDir, "vendor-risk-review.json"),
      JSON.stringify([
        { role: "meta", content: "--session=vendor-risk-review" },
        { role: "system", content: "sys" },
        { role: "user", content: "q" },
        { role: "assistant", content: "a" },
      ]),
    );
    const ss = await loadSessions(FAKE, { sessionsDir });
    expect(ss.map((s) => s.name)).toEqual(fixtureLines("sessions.txt"));
    expect(ss[0].messages).toBe(2);
  });

  test("an unreadable session file still lists, with no count", async () => {
    const ss = await loadSessions(FAKE, { sessionsDir: join(tmp, "nowhere") });
    expect(ss[0].messages).toBeUndefined();
  });

  test.each([["{not json"], ['{"role":"user"}'], ["null"]])(
    "a corrupt session file (%p) still lists, with no count",
    async (body) => {
      const sessionsDir = join(tmp, `bad-${Math.random().toString(36).slice(2)}`);
      mkdirSync(sessionsDir);
      for (const name of fixtureLines("sessions.txt")) writeFileSync(join(sessionsDir, `${name}.json`), body);
      const ss = await loadSessions(FAKE, { sessionsDir });
      expect(ss.map((s) => s.name)).toEqual(fixtureLines("sessions.txt"));
      expect(ss[0].messages).toBeUndefined();
    },
  );
});

describe("readStrategy: never hands an editor blanks for a file it couldn't read", () => {
  const dir = join(tmp, "strategies");
  mkdirSync(dir, { recursive: true });
  const put = (name: string, body: string) => writeFileSync(join(dir, `${name}.json`), body);

  test("missing → {} (a new strategy)", () => {
    expect(readStrategy("absent", dir)).toEqual({});
  });

  test("valid → its fields; non-string fields dropped", () => {
    put("ok", JSON.stringify({ description: "d", prompt: "p", extra: 1 }));
    put("odd", JSON.stringify({ description: 5, prompt: "p" }));
    expect(readStrategy("ok", dir)).toEqual({ description: "d", prompt: "p" });
    expect(readStrategy("odd", dir)).toEqual({ description: undefined, prompt: "p" });
  });

  test.each([['{"description":"d","prompt":"p",}'], ["null"], ["[1,2]"], ['"text"']])(
    "malformed or non-object %p → undefined",
    (body) => {
      put("bad", body);
      expect(readStrategy("bad", dir)).toBeUndefined();
    },
  );
});

describe("profileKey: reads what profileYaml writes, and hand-edited forms", () => {
  test("round trip for every key profileYaml writes", () => {
    const yaml = profileYaml({ model: "gpt-4o", temperature: "0.7", topp: "0.9", suppressThink: true });
    expect(["model", "temperature", "topp", "suppressThink"].map((k) => profileKey(yaml, k))).toEqual([
      "gpt-4o",
      "0.7",
      "0.9",
      "true",
    ]);
  });

  test.each<[string, string | undefined]>([
    ['model: "gpt-4o"', "gpt-4o"],
    ["model: 'gpt-4o'", "gpt-4o"],
    ['model: ""', undefined],
    ["model:", undefined],
    ["model: gpt-4o # fast one", "gpt-4o"],
    ["  model: indented", undefined],
    ["modelx: nope", undefined],
  ])("%p → %p", (yaml, want) => {
    expect(profileKey(yaml, "model")).toBe(want);
  });
});

describe("model lists", () => {
  test("a model offered by two vendors appears once", () => {
    expect(parseList("claude-haiku-4-5\ngpt-5\nclaude-haiku-4-5\n")).toEqual(["claude-haiku-4-5", "gpt-5"]);
  });
});

// The list-load error is shown in the failure state and offered as Copy Error, so it is redacted
// where it is made.
describe("a failed list load carries no secrets", () => {
  test("listNames rejects with fabric's stderr, keys redacted", async () => {
    const bin = join(tmp, "failing-fabric.sh");
    writeFileSync(
      bin,
      `#!/bin/sh\necho 'Error: OPENAI_API_KEY=sk-livesecret123 rejected' >&2\necho 'Authorization: Bearer tok_abc999' >&2\nexit 1\n`,
      { flag: "wx", mode: 0o755 },
    );
    const err = await listNames(bin, "--listpatterns").then(
      () => undefined,
      (e: Error) => e.message,
    );
    expect(err ?? "listNames resolved").toContain("rejected"); // fabric's own words survive
    expect(err).not.toContain("livesecret123");
    expect(err).not.toContain("tok_abc999");
    expect(err).toContain("[REDACTED]");
  });
});
