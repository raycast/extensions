import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { describe, expect, it } from "vitest";
import { insertLink, linkTriggerAt, listNotes } from "../src/links";

describe("linkTriggerAt", () => {
  it("finds a [[ just typed at the end", () => {
    expect(linkTriggerAt("see [", "see [[")).toBe(4);
    expect(linkTriggerAt("", "[[")).toBe(0);
  });

  it("finds a [[ just typed in the middle", () => {
    expect(linkTriggerAt("a[b", "a[[b")).toBe(1);
    expect(linkTriggerAt("one  two", "one [[ two")).toBe(4);
  });

  it("ignores other edits", () => {
    expect(linkTriggerAt("see [[", "see [[x")).toBeUndefined();
    expect(linkTriggerAt("see [[x", "see [[")).toBeUndefined();
    expect(linkTriggerAt("see", "see [[Note]]")).toBeUndefined();
    expect(linkTriggerAt("abc", "abc")).toBeUndefined();
    expect(linkTriggerAt("a", "a[")).toBeUndefined();
  });
});

describe("insertLink", () => {
  it("replaces the [[ with a finished link", () => {
    expect(insertLink("see [[", 4, "Note")).toBe("see [[Note]]");
    expect(insertLink("a[[b", 1, "Note")).toBe("a[[Note]]b");
  });
});

describe("listNotes", () => {
  function vault(files: Record<string, number>): string {
    const root = mkdtempSync(join(tmpdir(), "qa-links-"));
    for (const [path, mtime] of Object.entries(files)) {
      const full = join(root, path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, "");
      utimesSync(full, mtime, mtime);
    }
    return root;
  }

  it("lists markdown notes, newest first, skipping hidden folders and other files", () => {
    const root = vault({
      "Old.md": 1000,
      "Projects/New.md": 3000,
      "Middle.md": 2000,
      "picture.png": 4000,
      ".obsidian/workspace.md": 5000,
      ".trash/Gone.md": 5000,
    });
    expect(listNotes(root)).toEqual([
      { path: "Projects/New.md", name: "New", folder: "Projects", link: "New" },
      { path: "Middle.md", name: "Middle", folder: "", link: "Middle" },
      { path: "Old.md", name: "Old", folder: "", link: "Old" },
    ]);
  });

  it("links by path when two notes share a name", () => {
    const root = vault({ "Ideas.md": 2000, "Archive/Ideas.md": 1000, "Solo.md": 500 });
    expect(listNotes(root).map((note) => note.link)).toEqual(["Ideas", "Archive/Ideas", "Solo"]);
  });

  it("skips files it can't read instead of failing (e.g. removed during a sync)", async () => {
    const { chmodSync } = await import("fs");
    const root = vault({ "Ok.md": 1000, "Locked/Gone.md": 2000 });
    chmodSync(join(root, "Locked"), 0o644); // listable, but its files can't be stat'ed
    try {
      expect(listNotes(root).map((note) => note.link)).toEqual(["Ok"]);
    } finally {
      chmodSync(join(root, "Locked"), 0o755);
    }
  });

  it("returns nothing for a missing vault", () => {
    expect(listNotes("/nonexistent/vault")).toEqual([]);
  });
});

import {
  hashTriggerAt,
  insertTag,
  notesToTargets,
  obsidianLinkTargets,
  parseAliases,
  parseFileList,
  parseTags,
} from "../src/links";

describe("hashTriggerAt", () => {
  it("fires for # at the start or after whitespace", () => {
    expect(hashTriggerAt("", "#")).toBe(0);
    expect(hashTriggerAt("idea ", "idea #")).toBe(5);
    expect(hashTriggerAt("a\n", "a\n#")).toBe(2);
    expect(hashTriggerAt("a  b", "a # b")).toBe(2);
  });

  it("ignores # inside words, URLs and other edits", () => {
    expect(hashTriggerAt("C", "C#")).toBeUndefined();
    expect(hashTriggerAt("page", "page#")).toBeUndefined();
    expect(hashTriggerAt("#", "#t")).toBeUndefined();
    expect(hashTriggerAt("see ", "see #tag")).toBeUndefined();
  });
});

describe("insertTag", () => {
  it("replaces the # with the tag", () => {
    expect(insertTag("idea #", 5, "math")).toBe("idea #math");
    expect(insertTag("a # b", 2, "x/y")).toBe("a #x/y b");
  });
});

describe("parsing Obsidian CLI output", () => {
  it("reads the file list, one raw path per line", () => {
    expect(parseFileList("'Deep work'.md\nNotes/A b.md\r\nimg.png\n\n")).toEqual([
      "'Deep work'.md",
      "Notes/A b.md",
      "img.png",
    ]);
    expect(parseFileList("")).toEqual([]);
    expect(parseFileList("No files found.")).toEqual([]);
  });

  it("reads aliases as alias<TAB>path lines", () => {
    expect(parseAliases("(∞,1)-category\tScratch/inf.md\nDW\tDeep work.md\n")).toEqual([
      { alias: "(∞,1)-category", path: "Scratch/inf.md" },
      { alias: "DW", path: "Deep work.md" },
    ]);
    expect(parseAliases("No aliases found.")).toEqual([]);
  });

  it("reads tags with counts, without the #", () => {
    expect(parseTags({ items: [{ tag: "#math", count: "758" }, { tag: "#a/b", count: "2" }, { nope: 1 }] })).toEqual([
      { tag: "math", count: 758 },
      { tag: "a/b", count: 2 },
    ]);
    expect(parseTags({})).toEqual([]);
  });
});

describe("link targets", () => {
  const mtimes: Record<string, number> = { "A.md": 3, "sub/A.md": 1, "pic.png": 2, "Board.canvas": 4 };

  it("builds Obsidian-style links for notes, other files and aliases, newest first", () => {
    const targets = obsidianLinkTargets(
      ["A.md", "sub/A.md", "pic.png", "Board.canvas"],
      [{ alias: "Letter A", path: "sub/A.md" }],
      (path) => mtimes[path] ?? 0,
    );
    expect(targets.map((t) => [t.title, t.subtitle, t.link, t.kind])).toEqual([
      ["Board.canvas", "", "Board.canvas", "file"],
      ["A", "", "A", "note"],
      ["pic.png", "", "pic.png", "file"],
      ["A", "sub", "sub/A", "note"],
      ["Letter A", "→ sub/A", "sub/A|Letter A", "alias"],
    ]);
  });

  it("turns scanned notes into targets", () => {
    expect(notesToTargets([{ path: "x/N.md", name: "N", folder: "x", link: "N" }])).toEqual([
      { id: "x/N.md", title: "N", subtitle: "x", link: "N", kind: "note" },
    ]);
  });
});

import { linkableFiles } from "../src/links";

describe("linkableFiles", () => {
  const paths = [
    "A.md",
    "Board.canvas",
    "doc.pdf",
    "img.PNG",
    "song.mp3",
    "run.sh",
    "lib.js",
    "data.csv",
    "Archive/Old.md",
  ];

  it("keeps only file types Obsidian supports", () => {
    expect(linkableFiles(paths, {})).toEqual([
      "A.md",
      "Board.canvas",
      "doc.pdf",
      "img.PNG",
      "song.mp3",
      "Archive/Old.md",
    ]);
  });

  it("keeps everything when 'Detect all file extensions' is on", () => {
    expect(linkableFiles(paths, { showUnsupportedFiles: true })).toEqual(paths);
  });

  it("drops Obsidian's excluded files (folder paths and /regex/ filters)", () => {
    expect(linkableFiles(paths, { userIgnoreFilters: ["Archive/", "/^Board/"] })).toEqual([
      "A.md",
      "doc.pdf",
      "img.PNG",
      "song.mp3",
    ]);
  });
});
