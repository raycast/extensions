// Save as… on the Result view. ISC-70..73.
import { beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fake, resetFake, tmp } from "./raycast-mock";
import { render, typeName, until } from "./render-harness";
import { action, actions, field, submit, titles } from "./view-helpers";

const { saveAs, saveAsName } = await import("../lib/saveas");
const { PathError, refusedFolders } = await import("../lib/paths");
const { ANSWER_REFUSED, saveAnswer } = await import("../src/deliver");
const { FABRIC_DIR } = await import("../lib/loaders");
const { outputFileName } = await import("../lib/output");
const { SaveAs } = await import("../src/save-as");
const { ResultView } = await import("../src/result");

const FAKE = join(import.meta.dir, "fake-fabric.sh");
let n = 0;
/** A fresh home and fabric folder per test: Save as refuses folders under both. */
function setup() {
  const base = join(tmp, `saveas-${++n}`);
  const home = join(base, "home");
  const patternsRoot = join(home, ".config", "fabric", "patterns");
  for (const d of [patternsRoot, join(home, ".ssh"), join(home, "Library", "LaunchAgents"), join(base, "out")])
    mkdirSync(d, { recursive: true });
  const refused = refusedFolders(home, join(home, ".config", "fabric"));
  return { base, home, patternsRoot, out: join(base, "out"), o: { patternsRoot, refused } };
}

beforeEach(() => resetFake());

describe("ISC-70: Save As never overwrites", () => {
  test("an existing name gets -2 and the original is unchanged", () => {
    const s = setup();
    writeFileSync(join(s.out, "notes.md"), "original");
    const path = saveAs(s.out, "notes.md", "new answer", s.o);
    expect(path).toBe(join(realpathSync(s.out), "notes-2.md"));
    expect(readFileSync(join(s.out, "notes.md"), "utf8")).toBe("original");
    expect(readFileSync(path, "utf8")).toBe("new answer");
  });
});

describe("ISC-71: Save As never lands in fabric's patterns (the ISC-8.1 corpus)", () => {
  test("direct, inside, case variant, ../ and symlinked folders are refused, nothing created", () => {
    const s = setup();
    const link = join(s.base, "plink");
    symlinkSync(s.patternsRoot, link);
    for (const dir of [
      s.patternsRoot,
      join(s.patternsRoot, "summarize"),
      s.patternsRoot.replace("/patterns", "/PATTERNS"),
      join(s.out, "..", "home", ".config", "fabric", "patterns"),
      link,
      join(link, "x"),
    ])
      expect(() => saveAs(dir, "a.md", "x", s.o)).toThrow(PathError);
    expect(readdirSync(s.patternsRoot)).toEqual([]);
  });

  test("a name with a slash or .. is refused", () => {
    const s = setup();
    for (const name of ["../a.md", "x/a.md", "..md"]) expect(() => saveAs(s.out, name, "x", s.o)).toThrow(PathError);
  });
});

describe("ISC-72: Save As refuses other extensions and folders where a file runs code or holds keys", () => {
  test('the default name for text with "..." in it passes (review)', () => {
    const name = outputFileName("summarize", "Wait... what is this about", new Date(2026, 9, 19, 19, 30));
    expect(name).toBe("Wait. what is this about - summarize - 2026-10-19 1930.md");
    expect(saveAsName(name)).toBe(name);
  });

  test("only .md and .txt; a bare name gets .md", () => {
    expect(saveAsName("notes")).toBe("notes.md");
    expect(saveAsName(" notes.txt ")).toBe("notes.txt");
    expect(saveAsName("Notes.MD")).toBe("Notes.MD");
    for (const bad of ["x.sh", "x.md.sh", "x.plist", "x.command", "x.", ""])
      expect(() => saveAsName(bad)).toThrow(PathError);
  });

  test("a refused name writes nothing", () => {
    const s = setup();
    expect(() => saveAs(s.out, "run.sh", "x", s.o)).toThrow(PathError);
    expect(readdirSync(s.out)).toEqual([]);
  });

  test("LaunchAgents, ~/.ssh and all of ~/.config/fabric, directly, below and through a symlink", () => {
    const s = setup();
    const roots = [join(s.home, "Library", "LaunchAgents"), join(s.home, ".ssh"), join(s.home, ".config", "fabric")];
    for (const root of roots) {
      const link = join(s.base, `link-${roots.indexOf(root)}`);
      symlinkSync(root, link);
      for (const dir of [root, join(root, "sub"), link, root.toUpperCase().replace(s.base.toUpperCase(), s.base)])
        expect(() => saveAs(dir, "a.md", "x", s.o)).toThrow(PathError);
      expect(existsSync(join(root, "sub"))).toBe(false);
      expect(existsSync(join(root, "a.md"))).toBe(false);
    }
  });

  test("an ordinary folder under home is fine", () => {
    const s = setup();
    const docs = join(s.home, "Documents");
    expect(saveAs(docs, "a", "x", s.o)).toBe(join(realpathSync(docs), "a.md"));
  });
});

describe("ISC-72: every save route refuses the same folders", () => {
  test("the production list is home's LaunchAgents and .ssh plus fabric's folder", () => {
    expect(ANSWER_REFUSED).toEqual(refusedFolders(homedir(), FABRIC_DIR));
  });

  test("the Save as view refuses fabric's folder with the list it really uses", async () => {
    const answers = join(tmp, "fabric", "answers");
    const v = render(SaveAs, { text: "x", defaultName: "a.md", onSaved: () => {} });
    field(v.tree, "folder").onChange([answers]);
    await submit(v.tree).onSubmit();
    expect((field(v.tree, "folder") as { error?: string }).error).toContain("never saved into");
    expect(existsSync(answers)).toBe(false);
    expect(fake.nav.pops).toBe(0);
    v.unmount();
  });

  test("Save to File refuses fabric's folder, as Save as does", () => {
    // FABRIC_RAYCAST_TEST_DIR (test/preload.ts) is fabric's folder here.
    fake.prefs = { saveFolder: join(tmp, "fabric", "answers") };
    expect(() => saveAnswer("x", "summarize")).toThrow(PathError);
    expect(existsSync(join(tmp, "fabric", "answers"))).toBe(false);
  });
});

describe("the Save as view", () => {
  test("ISC-73: saving writes the file and makes zero Clipboard.copy or Clipboard.paste calls", async () => {
    const s = setup();
    fake.prefs = { saveFolder: s.out };
    let saved = "";
    const v = render(SaveAs, {
      text: "the answer",
      defaultName: "a - summarize.md",
      onSaved: (p: string) => (saved = p),
    });
    expect(field(v.tree, "folder").value).toEqual([s.out]);
    field(v.tree, "name").onChange("mine");
    await submit(v.tree).onSubmit();
    expect(saved).toBe(join(realpathSync(s.out), "mine.md"));
    expect(readFileSync(saved, "utf8")).toBe("the answer");
    expect(fake.copied).toEqual([]);
    expect(fake.pasted).toEqual([]);
    expect(fake.nav.pops).toBe(1);
    v.unmount();
  });

  test('a folder error stays on the Folder field, even when its path says "name"', async () => {
    const s = setup();
    const odd = join(s.out, "username-notes");
    writeFileSync(odd, "a file, not a folder"); // guardDir's mkdir fails: "can't use folder …username-notes…"
    fake.prefs = { saveFolder: s.out };
    const v = render(SaveAs, { text: "x", defaultName: "a.md", onSaved: () => {} });
    field(v.tree, "folder").onChange([odd]);
    await submit(v.tree).onSubmit();
    expect((field(v.tree, "folder") as { error?: string }).error).toContain("username-notes");
    expect((field(v.tree, "name") as { error?: string }).error).toBeUndefined();
    v.unmount();
  });

  test("a refused name shows on the name field and saves nothing", async () => {
    const s = setup();
    fake.prefs = { saveFolder: s.out };
    const v = render(SaveAs, { text: "x", defaultName: "a.sh", onSaved: () => {} });
    await submit(v.tree).onSubmit();
    expect((field(v.tree, "name") as { error?: string }).error).toContain(".md");
    expect(readdirSync(s.out)).toEqual([]);
    expect(fake.nav.pops).toBe(0);
    v.unmount();
  });

  test("a name with a slash or a leading dot is the Name field's error, not the folder's", async () => {
    const s = setup();
    fake.prefs = { saveFolder: s.out };
    for (const bad of ["x/a.md", ".hidden.md"]) {
      const v = render(SaveAs, { text: "x", defaultName: bad, onSaved: () => {} });
      await submit(v.tree).onSubmit();
      expect((field(v.tree, "name") as { error?: string }).error).toContain("only");
      expect((field(v.tree, "folder") as { error?: string }).error).toBeUndefined();
      v.unmount();
    }
    expect(readdirSync(s.out)).toEqual([]);
  });

  test("the folder picker starts empty when the Save Folder preference doesn't exist", () => {
    fake.prefs = { saveFolder: join(tmp, "no-such-folder") };
    const v = render(SaveAs, { text: "x", defaultName: "a.md", onSaved: () => {} });
    expect(field(v.tree, "folder").value).toEqual([]);
    v.unmount();
  });

  test("the Result view offers Save as… (⇧⌘S) once the answer is in, and it opens this form", async () => {
    fake.prefs = { fabricPath: FAKE };
    const v = render(ResultView, {
      fabricPath: FAKE,
      spec: { input: { kind: "text", text: "hi" }, pattern: "summarize" },
      inputLabel: "Clipboard",
      output: "file",
    });
    await until(() => titles(v.tree).includes("Save as…"));
    const a = actions(v.tree).find((e) => e.props.title === "Save as…")!;
    // ⇧⌘S spelled out: Raycast binds Common.Duplicate to ⌘D, whatever the lint rule's table says.
    expect(a.props.shortcut).toEqual({ modifiers: ["cmd", "shift"], key: "s" });
    action(v.tree, "Save as…").onAction();
    const pushed = fake.nav.pushed.at(-1)!;
    expect(typeName(pushed)).toBe("SaveAs");
    expect((pushed.props as { text: string }).text).toBe("chunk 1\nchunk 2\nchunk 3\n");
    v.unmount();
  });
});
