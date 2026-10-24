// Display labels, long runs and home-path scrubbing, at the pure seams. Render-level checks live in render.test.ts.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Input } from "../lib/argv";
import { inputLabel, isLong } from "../lib/classify";
import { scrubHome, tildify } from "../lib/paths";
import { unmountNotice } from "../lib/result";

const root = join(import.meta.dir, "..");
// A fake home, joined at runtime so no literal home path sits in the repo.
const HOME = join("/", "Users", "someone");

describe("ISC-100: a web page is a long run", () => {
  test.each([
    [{ kind: "url", url: "https://en.wikipedia.org/wiki/X" }, true],
    [{ kind: "youtube", url: "https://youtu.be/x" }, true],
    [{ kind: "media", path: "/a.mp3" }, true],
    [{ kind: "text", text: "hi" }, false],
    [{ kind: "image", path: "/a.png" }, false],
    [{ kind: "spotify", url: "https://open.spotify.com/episode/x" }, false],
  ] as [Input, boolean][])("%o → %p", (input, long) => {
    expect(isLong(input)).toBe(long);
  });

  test("the Long Runs preference names web pages", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      preferences: { name: string; title: string; description: string }[];
    };
    const pref = pkg.preferences.find((p) => p.name === "longInputs")!;
    expect(pref.title).toBe("Long Runs (Web Pages, YouTube, Audio, Video)");
    expect(pref.description).toContain("web page");
  });
});

describe("ISC-100.1: the notice an unmount sends", () => {
  test("names the run, says Raycast closed, and points at Run in Background", () => {
    expect(unmountNotice("extract_article_wisdom")).toBe(
      "Stopped: extract_article_wisdom. Its Result view closed before it finished. To keep a long run going, use ⌘↵ › Run in Background.",
    );
  });
});

describe("ISC-101: a link input says what it is and where it came from", () => {
  test.each([
    [{ kind: "url", url: "https://a.b/c" }, "Clipboard", "Web page · Clipboard"],
    [
      { kind: "youtube", url: "https://youtu.be/x" },
      "Selected text (Safari)",
      "YouTube video · Selected text (Safari)",
    ],
    [
      { kind: "spotify", url: "https://open.spotify.com/x" },
      "Typed in the run form",
      "Spotify link · Typed in the run form",
    ],
    [{ kind: "text", text: "hi" }, "Clipboard", "Clipboard"],
    [{ kind: "image", path: "/a.png" }, "Finder file", "Finder file"],
    [{ kind: "media", path: "/a.mp3" }, "File: a.mp3", "File: a.mp3"],
    [{ kind: "none" }, "Nothing selected", "Nothing selected"],
  ] as [Input, string, string][])("%o from %p", (input, origin, want) => {
    expect(inputLabel(origin, input)).toBe(want);
  });
});

describe("ISC-103 / ISC-103.1: paths show home as ~", () => {
  test.each([
    [`${HOME}/Documents/Fabric/a.md`, "~/Documents/Fabric/a.md"],
    [HOME, "~"],
    [`${HOME}2/x`, `${HOME}2/x`],
    ["/tmp/x", "/tmp/x"],
    [`relative${HOME}/x`, `relative${HOME}/x`],
  ])("%p → %p", (path, want) => {
    expect(tildify(path, HOME)).toBe(want);
  });

  test("a home with a trailing slash still matches", () => {
    expect(tildify(`${HOME}/a`, `${HOME}/`)).toBe("~/a");
  });
});

describe("ISC-103.2: error text shows home as ~", () => {
  test.each([
    [`never saved into ${HOME}/.ssh`, "never saved into ~/.ssh"],
    [`can't use folder ${HOME}: EACCES`, "can't use folder ~: EACCES"],
    [`EACCES: open '${HOME}/a b/x.md'`, "EACCES: open '~/a b/x.md'"],
    [`a ${HOME}2/x and ${HOME}.bak stay`, `a ${HOME}2/x and ${HOME}.bak stay`],
    [`two: ${HOME}/a, ${HOME}/b`, "two: ~/a, ~/b"],
  ])("%p", (text, want) => {
    expect(scrubHome(text, HOME)).toBe(want);
  });

  // Every error message the UI shows goes through errorText; a raw `.message` is the regression.
  test("no view shows a raw error message", () => {
    const files = readdirSync(join(root, "src")).filter((f) => /\.tsx?$/.test(f));
    expect(files.length).toBeGreaterThan(10); // the sweep read something
    const raw = files.flatMap((f) =>
      readFileSync(join(root, "src", f), "utf8")
        .split("\n")
        .map((l, i) => [`${f}:${i + 1}`, l] as const)
        .filter(
          ([, l]) => /as Error\)\.message|(message|error): \w+\.message/.test(l) && !/export const errorText/.test(l),
        )
        .map(([at]) => at),
    );
    expect(raw).toEqual([]);
  });
});
