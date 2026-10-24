import { describe, expect, test } from "bun:test";
import { type App, isSingleUrl, type Readers, shared, resolveInput, sourceLabel } from "../lib/input";

const FINDER: App = { name: "Finder", bundleId: "com.apple.finder" };
const TEXTEDIT: App = { name: "TextEdit", bundleId: "com.apple.TextEdit" };
const nope = () => Promise.reject(new Error("Unable to get selected text"));

function readers(over: Partial<Readers> = {}, calls: string[] = []): Readers {
  const log =
    <T>(n: string, f: () => Promise<T>) =>
    () => {
      calls.push(n);
      return f();
    };
  return {
    frontmostApp: log("app", over.frontmostApp ?? (async () => TEXTEDIT)),
    finderPaths: log("finder", over.finderPaths ?? (async () => [])),
    isFile: over.isFile ?? ((p) => !p.endsWith("/")),
    selectedText: log("selection", over.selectedText ?? nope),
    clipboardText: log("clipboard", over.clipboardText ?? (async () => undefined)),
  };
}

describe("ISC-13: Finder (frontmost only) › selection › clipboard › none", () => {
  test("Finder in front with a file selected → the file", async () => {
    const r = await resolveInput(
      readers({
        frontmostApp: async () => FINDER,
        finderPaths: async () => ["/tmp/a.txt"],
        selectedText: async () => "x",
      }),
    );
    expect(r).toEqual({ source: "finder", paths: ["/tmp/a.txt"], app: FINDER });
  });

  test("selected text beats the clipboard", async () => {
    const r = await resolveInput(readers({ selectedText: async () => "chosen", clipboardText: async () => "clip" }));
    expect(r).toMatchObject({ source: "selection", text: "chosen" });
  });

  test("no selection (reader rejects) falls through to the clipboard", async () => {
    const r = await resolveInput(readers({ clipboardText: async () => "clip" }));
    expect(r).toMatchObject({ source: "clipboard", text: "clip" });
  });

  test("nothing anywhere → none", async () => {
    const r = await resolveInput(readers({ clipboardText: async () => "  \n" }));
    expect(r.source).toBe("none");
  });

  test("Finder is never asked unless it is the frontmost app", async () => {
    const calls: string[] = [];
    await resolveInput(readers({ finderPaths: async () => ["/tmp/a.txt"], selectedText: async () => "t" }, calls));
    expect(calls).not.toContain("finder");
  });

  test("Finder in front with nothing selected falls through to text", async () => {
    const r = await resolveInput(readers({ frontmostApp: async () => FINDER, selectedText: async () => "t" }));
    expect(r).toMatchObject({ source: "selection", text: "t" });
  });

  test("a selected Finder folder is not an input; the clipboard is used", async () => {
    const r = await resolveInput(
      readers({
        frontmostApp: async () => FINDER,
        finderPaths: async () => ["/Users/x/out/"],
        clipboardText: async () => "https://youtu.be/x",
      }),
    );
    expect(r).toMatchObject({ source: "clipboard", text: "https://youtu.be/x" });
  });

  test("folders are dropped but files in the same selection stay", async () => {
    const r = await resolveInput(
      readers({ frontmostApp: async () => FINDER, finderPaths: async () => ["/a/", "/a/b.txt"] }),
    );
    expect(r).toMatchObject({ source: "finder", paths: ["/a/b.txt"] });
  });

  test("whitespace-only selection falls through", async () => {
    const r = await resolveInput(readers({ selectedText: async () => " ", clipboardText: async () => "clip" }));
    expect(r.source).toBe("clipboard");
  });

  test("a failing frontmost-app read still resolves", async () => {
    const r = await resolveInput(readers({ frontmostApp: nope, selectedText: async () => "t" }));
    expect(r).toEqual({ source: "selection", text: "t", app: undefined });
  });
});

describe("ISC-18.1 groundwork: the source is named", () => {
  test("labels", () => {
    expect(sourceLabel({ source: "selection", text: "x", app: TEXTEDIT })).toBe("Selected text (TextEdit)");
    expect(sourceLabel({ source: "clipboard", text: "x" })).toBe("Clipboard");
    expect(sourceLabel({ source: "finder", paths: ["/a", "/b"] })).toBe("Finder file (first of 2)");
    expect(sourceLabel({ source: "none" })).toBe("Nothing selected");
  });
});

describe("selection reads never overlap and never go stale", () => {
  test("concurrent callers share one read", async () => {
    let n = 0;
    const read = shared(async () => ++n);
    const [a, b] = await Promise.all([read(), read()]);
    expect([a, b, n]).toEqual([1, 1, 1]);
  });

  test("a call after the first settles reads again, so a reopened command sees the new selection", async () => {
    let n = 0;
    const read = shared(async () => ++n);
    await read();
    expect(await read()).toBe(2);
  });

  test("a failed read is not cached either", async () => {
    let n = 0;
    const read = shared(async () => {
      if (++n === 1) throw new Error("Unable to get selected text");
      return n;
    });
    await expect(read()).rejects.toThrow();
    expect(await read()).toBe(2);
  });
});

describe("quick runs leave single URLs to the classifier", () => {
  test("isSingleUrl", () => {
    expect(isSingleUrl(" https://youtu.be/x ")).toBe(true);
    expect(isSingleUrl("see https://x.com")).toBe(false);
    expect(isSingleUrl("file:///etc/passwd")).toBe(false);
    expect(isSingleUrl("plain words")).toBe(false);
  });
});
