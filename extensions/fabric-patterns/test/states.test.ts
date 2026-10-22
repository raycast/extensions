import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { notifyArgv, openInEditorArgv } from "../lib/macos";
import { classifyFailure, type StateAction, type StateId, stateFor } from "../lib/states";
import { missingPins } from "../lib/store";
import { fixture } from "./view-helpers";

describe("ISC-38: fabric's failures map to plain-language states", () => {
  test.each<[string, string, string | undefined, StateId]>([
    ["missing binary", "", "Error: spawn /opt/homebrew/bin/fabric ENOENT", "fabric-missing"],
    [
      "no .env",
      "error loading .env file: open /Users/x/.config/fabric/.env: no such file",
      undefined,
      "no-model",
    ],
    [
      "empty config",
      "please run 'fabric --setup' and select default model and vendor",
      undefined,
      "no-model",
    ],
    [
      "Anthropic 401",
      'POST "https://api.anthropic.com/v1/messages": 401 Unauthorized {"type":"authentication_error"}',
      undefined,
      "bad-key",
    ],
    ["OpenAI bad key", "Incorrect API key provided: sk-abc***", undefined, "bad-key"],
    ["Gemini bad key", "API key not valid. Please pass a valid API key.", undefined, "bad-key"],
    [
      "YouTube throttling",
      "YouTube rate limit exceeded. Try again later or use different yt-dlp arguments",
      undefined,
      "youtube-rate-limit",
    ],
    // ISC-66.1: real fabric 1.4.518, no Spotify credentials (probed 2026-10-19).
    ["Spotify not configured", fixture("spotify-not-configured.txt"), undefined, "spotify-setup"],
    ["anything else", "could not get pattern nope: not found", undefined, "failed"],
  ])("%s", (_, stderr, spawnError, id) => {
    expect(classifyFailure(stderr, spawnError)).toBe(id);
  });

  // The one action each state offers.
  const EXPECTED_ACTION: Record<StateId, StateAction> = {
    "fabric-missing": "open-preferences",
    "no-model": "copy-setup",
    "no-patterns": "download-patterns",
    "nothing-selected": "configure",
    "youtube-background": "none",
    "bad-key": "copy-command",
    "pinned-gone": "unpin",
    "pinned-chain-gone": "unpin",
    "cant-see-pattern": "copy-setup",
    "couldnt-paste": "none",
    "youtube-rate-limit": "none",
    "spotify-setup": "copy-setup",
    failed: "copy-command",
  };

  test("all 13 states are in the table", () => {
    expect(Object.keys(EXPECTED_ACTION).length).toBe(13);
  });

  test("ISC-66.1: the Spotify state names fabric's setup command", () => {
    const s = stateFor("spotify-setup");
    expect(s.title).toBe("Spotify isn't set up");
    expect(s.description).toContain("/opt/homebrew/bin/fabric-ai --setup");
  });

  // Homebrew installs fabric as fabric-ai, so a bare `fabric --setup` can fail or run another tool.
  test("every setup hint names the Fabric Path, quoted where the shell needs it", () => {
    const withSetup = ["no-model", "bad-key", "cant-see-pattern", "spotify-setup"] as const;
    for (const id of withSetup) {
      const s = stateFor(id, { fabricPath: "/opt/fab ric/fabric-ai" });
      expect(s.description).toContain("'/opt/fab ric/fabric-ai' --setup");
      expect(s.description).not.toMatch(/(^|[^-/])fabric --setup/);
    }
    for (const id of Object.keys(EXPECTED_ACTION) as StateId[]) {
      const s = stateFor(id, { fabricPath: "/x/bin/fabric" });
      expect(s.setupCommand).toBe(s.action === "copy-setup" ? "/x/bin/fabric --setup" : undefined);
    }
    expect(stateFor("no-model").setupCommand).toBe("/opt/homebrew/bin/fabric-ai --setup");
  });

  test.each(Object.entries(EXPECTED_ACTION) as [StateId, StateAction][])("%s offers %s", (id, action) => {
    const s = stateFor(id, { fabricPath: "/x/fabric", pattern: "my_old_pattern" });
    expect(s.id).toBe(id);
    expect(s.action).toBe(action);
  });

  // Preferences is a second action only where the path may be wrong though something ran;
  // fabric-missing already leads with it, and the rest match text only fabric prints.
  test("only failed and no-patterns are path suspects, and none offers Preferences twice", () => {
    const ids = Object.keys(EXPECTED_ACTION) as StateId[];
    expect(ids.filter((id) => stateFor(id).pathSuspect)).toEqual(["no-patterns", "failed"]);
    expect(ids.filter((id) => stateFor(id).pathSuspect && EXPECTED_ACTION[id] === "open-preferences")).toEqual([]);
  });

  test("detail fills in the path and the pattern name", () => {
    expect(stateFor("fabric-missing", { fabricPath: "/x/fabric" }).description).toContain("/x/fabric");
    expect(stateFor("pinned-gone", { pattern: "my_old_pattern" }).description).toContain("my_old_pattern");
  });

  test("fabric not found gives the install step and both Homebrew homes, not Apple Silicon's alone", () => {
    const d = stateFor("fabric-missing").description;
    expect(d).toContain("brew install fabric-ai");
    expect(d).toContain("/opt/homebrew/bin/fabric-ai");
    expect(d).toContain("/usr/local/bin/fabric-ai");
    expect(d).not.toContain("set the path to /opt/homebrew/bin/fabric-ai");
    // Raycast's empty view shows plain text, so markdown would show literally.
    expect(d).not.toMatch(/[`*_]/);
  });

  test("a pin whose pattern is gone is reported; nothing is reported before the list loads", () => {
    const usage = { pins: ["pattern:summarize", "pattern:my_old_pattern", "session:s"], counts: {} };
    expect(missingPins([{ id: "pattern:summarize" }], usage)).toEqual(["pattern:my_old_pattern"]);
    expect(missingPins([], usage)).toEqual([]);
  });
});

describe("ISC-7: no code path opens fabric's .env", () => {
  // The spy runs in its own process (test/env-spy.flow.ts): its node:fs and node:child_process
  // mocks would otherwise stay installed for every later test file.
  test("every fs and spawn call made by the lib flows is recorded, and none names a .env", () => {
    const flow = join(import.meta.dir, "env-spy.flow.ts");
    const r = spawnSync(process.execPath, [flow], { encoding: "utf8", timeout: 30_000 });
    expect(r.status === 0 ? "ran" : `flow failed: ${r.stderr}`).toBe("ran");
    const { fake, seen, refused } = JSON.parse(r.stdout.trim().split("\n").at(-1)!) as {
      fake: string;
      seen: string[];
      refused: boolean[];
    };
    expect(refused).toEqual([true, true, true]);
    expect(seen.length).toBeGreaterThan(10); // the spy really saw the flows
    expect(seen.some((s) => s.startsWith(`spawn:${fake}`))).toBe(true); // ...including the fabric spawns
    expect(seen.filter((s) => /(^|[/:])\.env\b/.test(s))).toEqual([]);
  });

  test("a .env file selected as input is refused, never read", async () => {
    const { classifyFile } = await import("../lib/classify");
    expect(() => classifyFile(join(process.env.HOME!, ".config/fabric/.env"))).toThrow(/secrets/);
    expect(() => classifyFile("/tmp/project/.env.local")).toThrow(/secrets/);
  });

  test("a symlink, hard link or copy of a .env under another name is refused too", async () => {
    const { classifyFile } = await import("../lib/classify");
    const d = realpathSync(mkdtempSync(join(tmpdir(), "fabric-secrets-")));
    try {
      // Each case is caught by exactly one check: the symlinked .env holds no key-like
      // line and has one link, so only the resolved-name check can refuse it.
      mkdirSync(join(d, "a"));
      const env = join(d, "a", ".env");
      writeFileSync(env, "DEFAULT_VENDOR=x\n");
      symlinkSync(env, join(d, "notes.txt"));
      symlinkSync(env, join(d, "pic.png"));
      const env2 = join(d, "env-copy-src");
      writeFileSync(env2, "DEFAULT_VENDOR=x\n");
      linkSync(env2, join(d, "hard.png"));
      linkSync(env2, join(d, "hard.txt"));
      writeFileSync(join(d, "copy.txt"), "# keys\nexport ANTHROPIC_API_KEY=sk-ant-api03-notreal0123456789\n");
      expect(() => classifyFile(join(d, "notes.txt"))).toThrow(/secrets/);
      expect(() => classifyFile(join(d, "pic.png"))).toThrow(/secrets/);
      expect(() => classifyFile(join(d, "hard.png"))).toThrow(/hard-linked/);
      expect(() => classifyFile(join(d, "hard.txt"))).toThrow(/hard-linked/);
      expect(() => classifyFile(join(d, "copy.txt"))).toThrow(/secrets/);
      writeFileSync(join(d, "copy2.env.txt"), 'GROQ_API_KEY="gsk_abcdefghijklmnop1234"\n');
      expect(() => classifyFile(join(d, "copy2.env.txt"))).toThrow(/secrets/);
      // Ordinary code and docs that mention keys are not refused.
      const ok = [
        "The API_KEY setting is described below.\n",
        "MAX_TOKENS = 4096\nTOKEN_LIMIT = 8\n",
        "MAX_TOKENS=4096\n",
        "Set it first:\n\nexport OPENAI_API_KEY=your-key-here\n",
        "OPENAI_API_KEY=<paste yours>\n",
        "api_key = os.environ['OPENAI_API_KEY']\n",
      ];
      ok.forEach((body, i) => {
        writeFileSync(join(d, `plain${i}.txt`), body);
        expect([i, classifyFile(join(d, `plain${i}.txt`)).kind]).toEqual([i, "text"]);
      });
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });
});

describe("the generic failure state shows fabric's own words", () => {
  test("the first two non-empty lines of the error, trimmed", () => {
    const s = stateFor("failed", { error: "\n  could not get pattern nope  \n\n  exit status 1\nthird line\n" });
    expect(s.description).toBe("could not get pattern nope\nexit status 1");
  });

  test("a single line is shown as it is", () => {
    expect(stateFor("failed", { error: "boom" }).description).toBe("boom");
  });

  test("a very long line is cut, so the view stays readable", () => {
    const d = stateFor("failed", { error: "x".repeat(1000) }).description;
    expect(d.length).toBeLessThanOrEqual(201);
    expect(d.endsWith("…")).toBe(true);
  });

  test("no error text: a plain sentence, and nothing points at a message below", () => {
    for (const error of [undefined, "", " \n \n"]) {
      const d = stateFor("failed", { error }).description;
      expect([error, d.length > 0, /below/i.test(d)]).toEqual([error, true, false]);
    }
  });
});

describe("macOS commands go out as argv, never a script with the text inside", () => {
  const HOSTILE = 'done" & do shell script "touch /tmp/pwned';
  const scripts = (args: string[]) => args.flatMap((a, i) => (args[i - 1] === "-e" ? [a] : []));

  test("the notification text is the last argv item and appears in no -e script", () => {
    const [cmd, args] = notifyArgv(HOSTILE);
    expect(cmd).toBe("/usr/bin/osascript");
    expect(args.slice(-2)).toEqual(["--", HOSTILE]);
    // A message that looks like an option must still be text: osascript stops parsing at --.
    expect(notifyArgv("-e return 1")[1].slice(-2)).toEqual(["--", "-e return 1"]);
    expect(args.filter((a) => a === HOSTILE).length).toBe(1);
    expect(scripts(args).length).toBe(3);
    for (const s of scripts(args)) expect([s, s.includes("touch")]).toEqual([s, false]);
  });

  test("the notification script is the one assets/fabric-bg.sh posts", () => {
    const sh = readFileSync(join(import.meta.dir, "..", "assets", "fabric-bg.sh"), "utf8");
    const notifier = sh.slice(sh.indexOf("FABRIC_BG_NOTIFIER:-"), sh.indexOf('"$msg"'));
    const shScripts = [...notifier.matchAll(/-e '([^']*)'/g)].map((m) => m[1]);
    expect(shScripts.length).toBe(3);
    expect(scripts(notifyArgv("x")[1])).toEqual(shScripts);
  });

  test("Open in Editor runs `open -t <file>`, so a .md opens in the text editor", () => {
    expect(openInEditorArgv("/tmp/a b/system.md")).toEqual(["/usr/bin/open", ["-t", "/tmp/a b/system.md"]]);
  });
});
