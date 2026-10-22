import { afterAll, describe, expect, test } from "bun:test";
import {
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PathError } from "../lib/paths";
import { lastAnswer, messageCount, parseSession, renderTranscript } from "../lib/session";
import { parseWorkflow } from "../lib/workflow";
import {
  deleteOwnFile,
  profileYaml,
  renameSession,
  saveChain,
  saveOwnFile,
  savePattern,
  saveStrategy,
} from "../lib/writers";

const tmp = realpathSync(mkdtempSync(join(tmpdir(), "fabric-editors-")));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
const patterns = join(tmp, "patterns");
mkdirSync(patterns);
let n = 0;
const dir = () => {
  const d = join(tmp, `d${++n}`);
  mkdirSync(d);
  return d;
};

describe("ISC-33: strategies save as the JSON fabric reads", () => {
  test("new, edit, rename; output parses to {description, prompt}", () => {
    const d = dir();
    saveStrategy(d, patterns, { name: "red-team", description: "Attack it", prompt: "Think like an attacker." });
    expect(JSON.parse(readFileSync(join(d, "red-team.json"), "utf8"))).toEqual({
      description: "Attack it",
      prompt: "Think like an attacker.",
    });
    saveStrategy(d, patterns, { name: "red-team", description: "v2", prompt: "p2", previousName: "red-team" });
    saveStrategy(d, patterns, { name: "red-team-2", description: "v3", prompt: "p3", previousName: "red-team" });
    expect(existsSync(join(d, "red-team.json"))).toBe(false);
    expect(JSON.parse(readFileSync(join(d, "red-team-2.json"), "utf8")).prompt).toBe("p3");
  });

  test("a new strategy can't take an existing name, and built-in names are refused", () => {
    const d = dir();
    saveStrategy(d, patterns, { name: "mine", description: "", prompt: "x" });
    expect(() => saveStrategy(d, patterns, { name: "mine", description: "", prompt: "y" })).toThrow(/already exists/);
    expect(() => saveStrategy(d, patterns, { name: "cot", description: "", prompt: "y" })).toThrow(/built-in/);
    expect(() => saveStrategy(d, patterns, { name: "cot", description: "", prompt: "y", previousName: "cot" })).toThrow(
      /built-in/,
    );
  });
});

describe("ISC-34: contexts save as plain text files", () => {
  test("save, edit, delete; a symlink is never written through", () => {
    const d = dir();
    saveOwnFile(d, "security-reviewer", "You review for security.", patterns);
    saveOwnFile(d, "security-reviewer", "Edited.", patterns, "security-reviewer");
    expect(readFileSync(join(d, "security-reviewer"), "utf8")).toBe("Edited.");
    const victim = join(tmp, "victim.txt");
    writeFileSync(victim, "keep");
    symlinkSync(victim, join(d, "sneaky"));
    expect(() => saveOwnFile(d, "sneaky", "x", patterns, "sneaky")).toThrow(PathError);
    expect(() => deleteOwnFile(d, "sneaky", patterns)).toThrow(PathError);
    expect(readFileSync(victim, "utf8")).toBe("keep");
    deleteOwnFile(d, "security-reviewer", patterns);
    expect(existsSync(join(d, "security-reviewer"))).toBe(false);
  });

  test("a folder under fabric's patterns is refused", () => {
    expect(() => saveOwnFile(join(patterns, "x"), "c", "t", patterns)).toThrow(PathError);
  });
});

const SESSION = JSON.stringify([
  { role: "meta", content: "--session=s -p summarize" },
  { role: "system", content: "# IDENTITY" },
  { role: "user", content: "first input" },
  { role: "assistant", content: "first answer" },
  { role: "user", content: "follow-up" },
  { role: "assistant", content: "second answer" },
]);

describe("ISC-35: the session view renders the whole transcript", () => {
  test("every user and assistant turn, in order, meta skipped", () => {
    const msgs = parseSession(SESSION);
    const md = renderTranscript(msgs);
    const order = ["first input", "first answer", "follow-up", "second answer"].map((t) => md.indexOf(t));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(md).not.toContain("--session=s");
    expect(messageCount(msgs)).toEqual({ turns: 4, system: true });
    expect(lastAnswer(msgs)).toBe("second answer");
  });

  // A scrubbed copy of a real fabric session, shaped like fabric writes it
  // (compact JSON, \n inside content, no trailing newline).
  test("a real fabric session (scrubbed fixture) parses", () => {
    const msgs = parseSession(readFileSync(join(import.meta.dir, "fixtures", "session-check.json"), "utf8"));
    expect(msgs.map((m) => m.role)).toEqual(["meta", "system", "user", "assistant"]);
    expect(messageCount(msgs)).toEqual({ turns: 2, system: true });
    expect(lastAnswer(msgs)).toBe("Dry run: Fake response sent by DryRun plugin\n");
    const md = renderTranscript(msgs);
    expect(md).toContain("hello");
    expect(md).not.toContain("--session=");
    expect(md).not.toContain("# IDENTITY");
  });

  test("garbage is refused", () => {
    expect(() => parseSession('{"role":"user"}')).toThrow();
  });
});

describe("ISC-35.2: rename moves the session file and never overwrites", () => {
  test("rename", () => {
    const d = dir();
    writeFileSync(join(d, "old.json"), SESSION);
    writeFileSync(join(d, "taken.json"), "[]");
    renameSession(d, "old", "new", patterns);
    expect(existsSync(join(d, "old.json"))).toBe(false);
    expect(readFileSync(join(d, "new.json"), "utf8")).toBe(SESSION);
    expect(() => renameSession(d, "new", "taken", patterns)).toThrow();
    expect(readFileSync(join(d, "taken.json"), "utf8")).toBe("[]");
    expect(() => renameSession(d, "new", "../escape", patterns)).toThrow(PathError);
  });

  test("ISC-48: a rename to its own name leaves the file alone", () => {
    const d = dir();
    writeFileSync(join(d, "same.json"), SESSION);
    expect(renameSession(d, "same", "same", patterns)).toBe(join(d, "same.json"));
    expect(readFileSync(join(d, "same.json"), "utf8")).toBe(SESSION);
  });

  test("ISC-48: the no-op still refuses a symlink and a missing file, like any rename", () => {
    const d = dir();
    const outside = join(dir(), "elsewhere.json");
    writeFileSync(outside, SESSION);
    symlinkSync(outside, join(d, "lnk.json"));
    expect(() => renameSession(d, "lnk", "lnk", patterns)).toThrow(PathError);
    expect(() => renameSession(d, "ghost", "ghost", patterns)).toThrow(expect.objectContaining({ code: "ENOENT" }));
    expect(() => renameSession(d, "ghost", "other", patterns)).toThrow(expect.objectContaining({ code: "ENOENT" }));
  });
});

// macOS's default disk ignores case, so Foo and foo name one file. Elsewhere these renames are ordinary.
const caseBlind = (() => {
  writeFileSync(join(tmp, "Probe"), "");
  return existsSync(join(tmp, "probe"));
})();

// Seen red: each test fails when its writer ignores caseVariant (all three were refused at 0ffe988),
// and the hard-link tests fail when caseVariant drops its own-entry check.
describe.if(caseBlind)("ISC-51: a case-only rename (Foo → foo) goes through", () => {
  test("session", () => {
    const d = dir();
    writeFileSync(join(d, "Foo.json"), SESSION);
    expect(renameSession(d, "Foo", "foo", patterns)).toBe(join(d, "foo.json"));
    expect(readdirSync(d)).toEqual(["foo.json"]);
    expect(readFileSync(join(d, "foo.json"), "utf8")).toBe(SESSION);
  });

  test("strategy, context or config file", () => {
    const d = dir();
    writeFileSync(join(d, "Foo.json"), "old");
    saveOwnFile(d, "foo.json", "new", patterns, "Foo.json");
    expect(readdirSync(d)).toEqual(["foo.json"]);
    expect(readFileSync(join(d, "foo.json"), "utf8")).toBe("new");
  });

  test("my pattern", () => {
    const d = dir();
    savePattern(d, patterns, { name: "Foo", system: "S", user: "U" });
    savePattern(d, patterns, { name: "foo", system: "S2", user: "U", previousName: "Foo" });
    expect(readdirSync(d)).toEqual(["foo"]);
    expect(readdirSync(join(d, "foo")).sort()).toEqual(["system.md", "user.md"]);
    expect(readFileSync(join(d, "foo", "system.md"), "utf8")).toBe("S2");
  });
});

describe("ISC-51.1: a hard link of the same file is still a taken name", () => {
  // Same file as the source, like a case variant, but its own entry in the folder.
  test("session onto a hard link of itself", () => {
    const d = dir();
    writeFileSync(join(d, "a.json"), SESSION);
    linkSync(join(d, "a.json"), join(d, "b.json"));
    expect(() => renameSession(d, "a", "b", patterns)).toThrow(expect.objectContaining({ code: "EEXIST" }));
    expect(readdirSync(d).sort()).toEqual(["a.json", "b.json"]);
    expect(readFileSync(join(d, "a.json"), "utf8")).toBe(SESSION);
  });

  test("file onto a hard link of itself", () => {
    const d = dir();
    writeFileSync(join(d, "a.json"), "old");
    linkSync(join(d, "a.json"), join(d, "b.json"));
    expect(() => saveOwnFile(d, "b.json", "new", patterns, "a.json")).toThrow(PathError);
    expect(readdirSync(d).sort()).toEqual(["a.json", "b.json"]);
    expect(readFileSync(join(d, "a.json"), "utf8")).toBe("old");
  });
});

describe.if(caseBlind)("ISC-51.1: a respelling of a different entry is still taken", () => {
  // revert the toLowerCase name check in caseVariant → both go through and bar.json is overwritten
  test("hard link spelled in another case (Foo → BAR, with bar a link of Foo)", () => {
    const d = dir();
    writeFileSync(join(d, "Foo.json"), "old");
    linkSync(join(d, "Foo.json"), join(d, "bar.json"));
    expect(() => renameSession(d, "Foo", "BAR", patterns)).toThrow(expect.objectContaining({ code: "EEXIST" }));
    expect(() => saveOwnFile(d, "BAR.json", "new", patterns, "Foo.json")).toThrow(PathError);
    expect(readdirSync(d).sort()).toEqual(["Foo.json", "bar.json"]);
    expect(readFileSync(join(d, "bar.json"), "utf8")).toBe("old");
  });

  test("another file in another case (Bar → foo, with Foo present)", () => {
    const d = dir();
    writeFileSync(join(d, "Bar.json"), "BAR");
    writeFileSync(join(d, "Foo.json"), "FOO");
    expect(() => renameSession(d, "Bar", "foo", patterns)).toThrow(expect.objectContaining({ code: "EEXIST" }));
    expect(() => saveOwnFile(d, "foo.json", "new", patterns, "Bar.json")).toThrow(PathError);
    expect(readdirSync(d).sort()).toEqual(["Bar.json", "Foo.json"]);
    expect(readFileSync(join(d, "Foo.json"), "utf8")).toBe("FOO");
  });
});

describe("ISC-36: a run profile is --config YAML with no pattern key", () => {
  test("only probed keys, blanks left out", () => {
    expect(profileYaml({ model: "claude-haiku-4-5", temperature: "0.2", topp: "", suppressThink: true })).toBe(
      "model: claude-haiku-4-5\ntemperature: 0.2\nsuppressThink: true\n",
    );
    expect(profileYaml({})).toBe("\n");
    expect(profileYaml({ model: "m", temperature: "0.5" })).not.toMatch(/pattern/);
  });

  test("bad values are refused, including YAML injection through the model", () => {
    expect(() => profileYaml({ temperature: "hot" })).toThrow();
    expect(() => profileYaml({ topp: "3" })).toThrow();
    expect(() => profileYaml({ model: "m\npattern: summarize" })).toThrow();
    expect(() => profileYaml({ model: "-m" })).toThrow();
    expect(() => profileYaml({ model: "a/../b" })).toThrow();
    expect(() => profileYaml({ model: "m", vendor: "ClaudeCode\npattern: summarize" })).toThrow();
  });

  test("a vendor is written only beside a model", () => {
    expect(profileYaml({ model: "claude-haiku-4-5", vendor: "ClaudeCode" })).toBe(
      "model: claude-haiku-4-5\nvendor: ClaudeCode\n",
    );
    expect(profileYaml({ vendor: "ClaudeCode" })).toBe("\n");
  });
});

describe("ISC-81.1 / ISC-85: a chain saves as fabric's workflow JSON, only where a chain belongs", () => {
  const installed = new Set(["summarize", "extract_wisdom"]);
  const steps = [{ pattern: "summarize" }, { pattern: "extract_wisdom", model: "llama3.2:1b", vendor: "Ollama" }];

  test("save writes JSON parseWorkflow accepts, named for the file; a rename moves it", () => {
    const d = dir();
    const path = saveChain(d, patterns, { name: "probe-chain", steps }, installed);
    expect(path).toBe(join(d, "probe-chain.json"));
    const back = parseWorkflow(readFileSync(path, "utf8"), installed);
    expect(back).toEqual({ ok: true, workflow: { name: "probe-chain", steps } });
    saveChain(d, patterns, { name: "probe-chain2", steps, previousName: "probe-chain" }, installed);
    expect(readdirSync(d)).toEqual(["probe-chain2.json"]);
    expect(JSON.parse(readFileSync(join(d, "probe-chain2.json"), "utf8")).name).toBe("probe-chain2");
  });

  test("a step repeating the one before is refused and nothing is written", () => {
    const d = dir();
    expect(() =>
      saveChain(d, patterns, { name: "rep", steps: [{ pattern: "summarize" }, { pattern: "summarize" }] }, installed),
    ).toThrow(/repeats/);
    expect(() => saveChain(d, patterns, { name: "gone", steps: [{ pattern: "nope_xyz" }] }, installed)).toThrow(
      /isn't installed/,
    );
    expect(() => saveChain(d, patterns, { name: "../x", steps }, installed)).toThrow(PathError);
    expect(readdirSync(d)).toEqual([]);
  });

  test("a workflows folder symlinked into fabric's patterns is refused, and nothing lands there", () => {
    const d = dir();
    const before = readdirSync(patterns, { recursive: true }).sort();
    symlinkSync(patterns, join(d, "workflows"));
    expect(() => saveChain(join(d, "workflows"), patterns, { name: "evil", steps }, installed)).toThrow(PathError);
    mkdirSync(join(patterns, "sub"), { recursive: true });
    symlinkSync(join(patterns, "sub"), join(d, "workflows2"));
    expect(() => saveChain(join(d, "workflows2"), patterns, { name: "evil", steps }, installed)).toThrow(PathError);
    rmSync(join(patterns, "sub"), { recursive: true });
    expect(readdirSync(patterns, { recursive: true }).sort()).toEqual(before);
  });
});
