import { afterAll, describe, expect, test } from "bun:test";
import {
  existsSync,
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
import { buildArgv } from "../lib/argv";
import { ClassifyError, classifyFile, classifyText } from "../lib/classify";
import { loadProfiles } from "../lib/loaders";
import { deliver, type DeliverDeps, inputSubject, outputFileName } from "../lib/output";
import { PathError, writeNewFile } from "../lib/paths";
import { runFabric } from "../lib/runner";
import { patternVariables, variableValues } from "../lib/variables";
import { REAL, RUN_REAL } from "./real-fabric";

const tmp = mkdtempSync(join(tmpdir(), "fabric-configure-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe("ISC-15: inputs route to the right fabric flag", () => {
  test.each<[string, ReturnType<typeof classifyText>["kind"]]>([
    ["https://www.youtube.com/watch?v=abc", "youtube"],
    ["https://youtu.be/abc", "youtube"],
    ["https://m.youtube.com/watch?v=abc", "youtube"],
    ["https://example.com/post", "url"],
    ["https://notyoutube.com/watch?v=abc", "url"],
    ["just some words https://youtu.be/x", "text"],
  ])("%s → %s", (text, kind) => {
    expect(classifyText(text).kind).toBe(kind);
  });

  test("YouTube → --youtube, other URL → --scrape_url", () => {
    expect(buildArgv({ input: classifyText("https://youtu.be/abc") })).toEqual([
      "--youtube=https://youtu.be/abc",
      "--transcript",
    ]);
    expect(buildArgv({ input: classifyText("https://example.com") })).toEqual(["--scrape_url=https://example.com"]);
  });

  test("files route by type: text piped, image -a, audio/video --transcribe-file", () => {
    const txt = join(tmp, "notes.md");
    writeFileSync(txt, "hello file");
    expect(classifyFile(txt)).toEqual({ kind: "text", text: "hello file" });
    const f = (name: string) => {
      const p = join(tmp, name);
      writeFileSync(p, "bytes");
      return p;
    };
    expect(classifyFile(f("photo.JPG"))).toEqual({ kind: "image", path: realpathSync(join(tmp, "photo.JPG")) });
    expect(classifyFile(f("talk.m4a")).kind).toBe("media");
    expect(classifyFile(f("clip.mov")).kind).toBe("media");
    expect(buildArgv({ input: classifyFile(f("photo.png")) })).toEqual([
      `--attachment=${realpathSync(join(tmp, "photo.png"))}`,
    ]);
    expect(buildArgv({ input: { kind: "media", path: "/x/a.mp3", transcribeModel: "whisper-1" } })).toEqual([
      "--transcribe-file=/x/a.mp3",
      "--transcribe-model=whisper-1",
    ]);
  });

  test("binary and PDF files are refused with a reason", () => {
    const bin = join(tmp, "blob.dat");
    writeFileSync(bin, Buffer.from([1, 0, 2]));
    expect(() => classifyFile(bin)).toThrow(ClassifyError);
    const pdf = join(tmp, "paper.pdf");
    writeFileSync(pdf, "%PDF-1.4");
    expect(() => classifyFile(pdf)).toThrow(/PDF/);
  });
});

describe("ISC-16: a pattern's {{variables}} become fields, and only then", () => {
  test("identifier variables, deduped, minus {{input}}", () => {
    expect(patternVariables("lang {{lang_code}} and {{ lang_code }} then {{input}} and {{interactsh-url}}")).toEqual([
      "lang_code",
      "interactsh-url",
    ]);
  });

  test("one field per name, but its value goes to every spelling fabric sees ({{ x }} ≠ {{x}})", () => {
    const md = "Say {{ name }} and {{name}} in {{\tlang }}. {{input}}";
    expect(patternVariables(md)).toEqual(["name", "lang"]);
    const vals = variableValues(md, { name: "Ann", lang: "fr" });
    expect(vals).toEqual({ " name ": "Ann", name: "Ann", "\tlang ": "fr" });
    expect(buildArgv({ input: { kind: "text", text: "x" }, variables: vals })).toEqual([
      "--variable= name :Ann",
      "--variable=name:Ann",
      "--variable=\tlang :fr",
    ]);
  });

  test("no variables → no fields", () => {
    expect(patternVariables("# IDENTITY\nSummarize.\n{{input}}")).toEqual([]);
    expect(patternVariables(undefined)).toEqual([]);
  });

  const TRANSLATE = join(process.env.HOME!, ".config/fabric/patterns/translate/system.md");
  test.skipIf(!RUN_REAL || !existsSync(TRANSLATE))(
    "real translate pattern: field found, and fabric substitutes the value",
    async () => {
      const md = readFileSync(TRANSLATE, "utf8");
      expect(patternVariables(md)).toEqual(["lang_code"]);
      const argv = buildArgv({
        input: { kind: "text", text: "hola" },
        pattern: "translate",
        variables: { lang_code: "zz-test" },
        dryRun: true,
      });
      const r = await runFabric(REAL, argv, { stdin: "hola" }).done;
      expect(r.code).toBe(0);
      expect(r.stdout).toContain("zz-test");
    },
  );
});

describe("ISC-19: Preview Prompt is a --dry-run", () => {
  test("dry run passes --dry-run and never --session", () => {
    const a = buildArgv({ input: { kind: "text", text: "x" }, pattern: "summarize", session: "s1", dryRun: true });
    expect(a).toContain("--dry-run");
    expect(a.some((x) => x.startsWith("--session"))).toBe(false);
  });

  test.skipIf(!RUN_REAL)("real fabric dry run returns the rendered prompt without a model call", async () => {
    const r = await runFabric(
      REAL,
      buildArgv({ input: { kind: "text", text: "preview me" }, pattern: "summarize", dryRun: true }),
      {
        stdin: "preview me",
      },
    ).done;
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Dry run");
    expect(r.stdout).toContain("preview me");
  });
});

function deps(front: { name: string; bundleId?: string } | undefined, dir = tmp) {
  const calls: string[] = [];
  let clip = "";
  const d: DeliverDeps = {
    copy: async (t) => void (calls.push("copy"), (clip = t)),
    paste: async (t) => void (calls.push("paste"), (clip = t)),
    frontmostApp: async () => front,
    save: async (t) => (calls.push("save"), writeNewFile(dir, "answer.md", t, join(tmp, "patterns"))),
    toast: async (title, msg) => void calls.push(`toast:${title}${msg ? `:${msg}` : ""}`),
    notice: async (t) => void calls.push(`notice:${t}`),
  };
  return { d, calls, clip: () => clip };
}

const TEXTEDIT = { name: "TextEdit", bundleId: "com.apple.TextEdit" };

describe("ISC-22: clipboard, file and clipboard+file each get the exact answer", () => {
  const answer = "Line one\n\n- a `tick` and $dollar\nlast line without newline";

  test("clipboard", async () => {
    const { d, calls, clip } = deps(TEXTEDIT);
    expect(await deliver(answer, "clipboard", TEXTEDIT, d)).toBe("Copied to clipboard");
    expect(clip()).toBe(answer);
    expect(calls).not.toContain("save");
  });

  test("file", async () => {
    const dir = join(tmp, "out-file");
    const { d, calls } = deps(TEXTEDIT, dir);
    expect(await deliver(answer, "file", TEXTEDIT, d)).toBe(`Saved: ${join(realpathSync(dir), "answer.md")}`);
    expect(calls).not.toContain("copy");
    expect(readFileSync(join(dir, "answer.md"), "utf8")).toBe(answer);
  });

  test("clipboard + file, and a second save never overwrites the first", async () => {
    const dir = join(tmp, "out-both");
    const { d, clip } = deps(TEXTEDIT, dir);
    expect(await deliver(answer, "clipboard-file", TEXTEDIT, d)).toBe(
      `Copied and saved: ${join(realpathSync(dir), "answer.md")}`,
    );
    await deliver("second", "clipboard-file", TEXTEDIT, d);
    expect(clip()).toBe("second");
    expect(readFileSync(join(dir, "answer.md"), "utf8")).toBe(answer);
    expect(readFileSync(join(dir, "answer-2.md"), "utf8")).toBe("second");
  });

  test("file names say what the answer is about, then the pattern and the minute", () => {
    const at = new Date(2026, 9, 17, 15, 4);
    const name = (input: Parameters<typeof inputSubject>[0]) => outputFileName("summarize", inputSubject(input), at);
    expect(name({ kind: "text", text: "Zero trust: what it means/for us today and tomorrow\nmore" })).toBe(
      "Zero trust- what it means-for us today and - summarize - 2026-10-17 1504.md",
    );
    expect(name({ kind: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" })).toBe(
      "YouTube dQw4w9WgXcQ - summarize - 2026-10-17 1504.md",
    );
    expect(name({ kind: "url", url: "https://example.com/blog/zero-trust" })).toBe(
      "example.com zero-trust - summarize - 2026-10-17 1504.md",
    );
    expect(name({ kind: "media", path: "/x/Board meeting.m4a" })).toBe(
      "Board meeting - summarize - 2026-10-17 1504.md",
    );
    expect(outputFileName("summarize", "../../etc", at)).toBe("etc - summarize - 2026-10-17 1504.md");
    expect(outputFileName("summarize", undefined, at)).toBe("summarize - 2026-10-17 1504.md");
  });
});

describe("ISC-24: paste falls back to copy + Toast when the target app changed", () => {
  test("same app in front → paste", async () => {
    const { d, calls } = deps(TEXTEDIT);
    expect(await deliver("x", "paste", TEXTEDIT, d)).toBe("Pasted into TextEdit");
    expect(calls).toEqual(["paste"]);
  });

  test("another app in front → copy and say so", async () => {
    const { d, calls, clip } = deps({ name: "Finder", bundleId: "com.apple.finder" });
    // The Result view shows this, so a reopened Raycast says it copied instead of pasting.
    expect(await deliver("x", "paste", TEXTEDIT, d)).toBe("Copied (TextEdit wasn't in front)");
    expect(calls[0]).toBe("copy");
    expect(calls[1]).toMatch(/^notice:Copied, not pasted: TextEdit isn't in front/);
    expect(clip()).toBe("x");
  });

  test("the copy fallback never waits on the notification", async () => {
    const { d } = deps({ name: "Finder", bundleId: "com.apple.finder" });
    d.notice = () => new Promise<void>(() => {}); // osascript that never exits
    const done = deliver("x", "paste", TEXTEDIT, d);
    const late = new Promise((r) => setTimeout(() => r("still waiting"), 200));
    expect(await Promise.race([done, late])).toBe("Copied (TextEdit wasn't in front)");
  });

  test("unknown start app or unreadable front app → copy", async () => {
    const a = deps(TEXTEDIT);
    await deliver("x", "paste", undefined, a.d);
    expect(a.calls[0]).toBe("copy");
    const b = deps(undefined);
    await deliver("x", "paste", TEXTEDIT, b.d);
    expect(b.calls[0]).toBe("copy");
  });
});

describe("output writes never land in fabric's patterns folder (ISC-8 groundwork)", () => {
  const root = join(tmp, "patterns");
  mkdirSync(root, { recursive: true });

  test("direct, case-variant, ../ and symlinked folders are refused", () => {
    expect(() => writeNewFile(join(root, "summarize"), "a.md", "x", root)).toThrow(PathError);
    expect(() => writeNewFile(root.toUpperCase().replace(tmp.toUpperCase(), tmp), "a.md", "x", root)).toThrow(
      PathError,
    );
    expect(() => writeNewFile(join(tmp, "out", "..", "patterns"), "a.md", "x", root)).toThrow(PathError);
    const link = join(tmp, "sneaky");
    symlinkSync(root, link);
    expect(() => writeNewFile(link, "a.md", "x", root)).toThrow(PathError);
    // Nothing was created under the root, not even the refused `summarize` folder.
    expect(readdirSync(root)).toEqual([]);
  });

  test("a symlinked final component is skipped, never written through", () => {
    const dir = join(tmp, "out-link");
    mkdirSync(dir);
    const victim = join(tmp, "victim.txt");
    writeFileSync(victim, "keep");
    symlinkSync(victim, join(dir, "a.md"));
    expect(writeNewFile(dir, "a.md", "new", root)).toBe(join(realpathSync(dir), "a-2.md"));
    expect(readFileSync(victim, "utf8")).toBe("keep");
  });

  test("names with a slash are refused", () => {
    expect(() => writeNewFile(tmp, "../x.md", "x", root)).toThrow(PathError);
  });
});

describe("run profiles list from the support folder", () => {
  test("model and vendor read from the YAML", () => {
    const dir = join(tmp, "profiles");
    mkdirSync(dir);
    writeFileSync(join(dir, "fast.yaml"), "model: claude-haiku-4-5\nvendor: Anthropic\n");
    expect(loadProfiles(dir)).toEqual([
      { name: "fast", path: join(dir, "fast.yaml"), model: "claude-haiku-4-5", vendor: "Anthropic" },
    ]);
    expect(loadProfiles(join(tmp, "missing"))).toEqual([]);
  });
});
