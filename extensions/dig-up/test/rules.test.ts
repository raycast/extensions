// Ported from DigUp's RulesTests.swift and FolderSelectionTests.swift (the crawler's own tests belong to crawler.ts),
// the classifyCode cases of CodeTests.swift, and the macOS classifier's order (Files+Apple.swift).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, describe, test } from "node:test";
import {
  type Classification,
  FolderSelection,
  classify,
  classifyCode,
  codeSkipReason,
  datasetFolders,
  deletingPathExtension,
  fileSystemForm,
  isMPEGTransportStream,
  isProjectRoot,
  isProjectRootFolder,
  isSecret,
  isWalked,
  keepCandidates,
  lastPathComponent,
  looksMachineNamed,
  parentPath,
  parseExtensions,
  pathExtension,
  skipReason,
} from "../engine/rules";
import { DEFAULT_OPTIONS, type FileKind } from "../engine/types";

const folder = mkdtempSync(join(tmpdir(), "dig-up-rules-"));
after(() => rmSync(folder, { recursive: true, force: true }));

function write(name: string, body: string | Uint8Array = "x"): string {
  const path = join(folder, name);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, body);
  return path;
}

/** Four 188-byte MPEG-TS packets (with a 4-byte timecode before each when `timecode`). */
function transportStream(timecode = false): Uint8Array {
  const step = timecode ? 192 : 188;
  const bytes = new Uint8Array(step * 4).fill(0xff);
  for (let packet = 0; packet < 4; packet++) bytes[packet * step + (timecode ? 4 : 0)] = 0x47;
  return bytes;
}

const index = (kind: FileKind): Classification => ({ action: "index", kind });
const skip = (reason: string): Classification => ({ action: "skip", reason });
const IGNORE: Classification = { action: "ignore" };

describe("classify (the main index)", () => {
  test("TypeScript is not video", () => {
    const file = write("app.ts", "export const x: number = 1;\n");
    assert.deepEqual(classify(file, null, DEFAULT_OPTIONS), skip("code or data file"));
  });

  test("a real transport stream is video", () => {
    assert.deepEqual(classify(write("clip.ts", transportStream()), null, DEFAULT_OPTIONS), index("video"));
    assert.deepEqual(classify(write("clip.m2ts", transportStream(true)), null, DEFAULT_OPTIONS), index("video"));
    assert.deepEqual(
      classify(write("clip.mts", transportStream().slice(0, 399)), null, DEFAULT_OPTIONS),
      skip("code or data file"),
    );
  });

  test("the testbed's .ts traps", (t) => {
    const clip = resolve(".testbed/traps/real-mpeg-ts/zoo clip.ts");
    const code = resolve(".testbed/traps/ts-code/app.ts");
    if (!existsSync(clip) || !existsSync(code)) return t.skip("no .testbed (it isn't checked in)");
    assert.equal(isMPEGTransportStream(clip), true);
    assert.deepEqual(classify(clip, "movie", DEFAULT_OPTIONS), index("video"));
    assert.deepEqual(classify(code, "movie", DEFAULT_OPTIONS), skip("code or data file")); // Spotlight says movie
  });

  test("code can be included", () => {
    const options = { ...DEFAULT_OPTIONS, includeCode: true };
    assert.deepEqual(classify(join(folder, "main.py"), null, options), index("doc"));
    assert.deepEqual(classify(join(folder, "main.py"), null, DEFAULT_OPTIONS), skip("code or data file"));
  });

  test("follows the macOS order: excluded, .ts, documents, code and data, then the type", () => {
    const options = { ...DEFAULT_OPTIONS, excludedExtensions: ["heic"] };
    assert.deepEqual(classify("/d/IMG_1.HEIC", "image", options), skip("excluded type"));
    assert.deepEqual(classify("/d/notes.md", "sourceCode", options), index("doc"));
    assert.deepEqual(classify("/d/page.html", "sourceCode", options), index("doc"));
    assert.deepEqual(classify("/d/rows.csv", null, options), skip("code or data file"));
    assert.deepEqual(classify("/d/tool.swift", "sourceCode", options), skip("code or data file"));
    assert.deepEqual(classify("/d/run.command", "sourceCode", options), skip("code or data file"));
    assert.deepEqual(classify("/d/book.pdf", "pdf", options), index("pdf"));
    assert.deepEqual(classify("/d/chart.svg", "image", options), index("image"));
    assert.deepEqual(classify("/d/Screenshot 2026-10-01 at 9.41.07 PM.png", "image", options), index("screenshot"));
    assert.deepEqual(classify("/d/IMG_2.png", "image", options, true), index("screenshot")); // the marker
    assert.deepEqual(classify("/d/talk.mov", "movie", options), index("video"));
    assert.deepEqual(classify("/d/song.m4a", "audio", options), index("audio"));
    assert.deepEqual(classify("/d/calendar.ics", null, options), IGNORE);
  });

  test("without a type, the extension lists decide", () => {
    assert.deepEqual(classify("/d/clip.mkv", null, DEFAULT_OPTIONS), index("video"));
    assert.deepEqual(classify("/d/voice.opus", null, DEFAULT_OPTIONS), index("audio"));
    assert.deepEqual(classify("/d/IMG_9.JPG", null, DEFAULT_OPTIONS), index("image"));
    assert.deepEqual(classify("/d/CleanShot 2026.png", null, DEFAULT_OPTIONS), index("screenshot"));
    assert.deepEqual(classify("/d/scan.pdf", undefined, DEFAULT_OPTIONS), index("pdf"));
    assert.deepEqual(classify("/d/paper.tex", null, DEFAULT_OPTIONS), skip("code or data file"));
    assert.deepEqual(classify("/d/model.blend", null, DEFAULT_OPTIONS), IGNORE);
  });

  test("doesn't look at names for secrets, as DigUp's main index doesn't", () => {
    // DigUp checks key and password file names in code folders only (Rules.swift: classifyCode). Its prefix test
    // would skip all of these.
    assert.deepEqual(classify("/d/Secret Santa 2025.docx", null, DEFAULT_OPTIONS), index("doc"));
    assert.deepEqual(classify("/d/secretary minutes.pdf", "pdf", DEFAULT_OPTIONS), index("pdf"));
    assert.deepEqual(classify("/d/secret_plans.png", "image", DEFAULT_OPTIONS), index("image"));
    assert.deepEqual(classify("/d/Secrets of the Universe.mp3", "audio", DEFAULT_OPTIONS), index("audio"));
    assert.deepEqual(classify("/d/credentials.txt", null, DEFAULT_OPTIONS), index("doc"));
    // Key and certificate types are in none of its lists.
    for (const name of ["prod.pem", "id_rsa", ".env.local", "cert.CRT"]) {
      assert.deepEqual(classify(`/d/${name}`, null, DEFAULT_OPTIONS), IGNORE, name);
    }
  });

  test("a FIFO named .ts is not waited on", () => {
    const fifo = join(folder, "stream.ts");
    execFileSync("mkfifo", [fifo]);
    assert.equal(isMPEGTransportStream(fifo), false);
    assert.deepEqual(classify(fifo, "movie", DEFAULT_OPTIONS), skip("code or data file"));
    assert.deepEqual(classifyCode(fifo, DEFAULT_OPTIONS), index("code"));
  });

  test("a .ts that isn't downloaded is left in the cloud, not read", () => {
    const clip = write("cloud/clip.ts", transportStream());
    const facts = { dataless: true, inCloud: false };
    assert.deepEqual(classify(clip, "movie", DEFAULT_OPTIONS, false, facts), skip("in the cloud, not downloaded"));
    assert.deepEqual(
      classifyCode(clip, DEFAULT_OPTIONS, { dataless: false, inCloud: true }),
      skip("in the cloud, not downloaded"),
    );
    assert.deepEqual(
      classify(clip, "movie", DEFAULT_OPTIONS, false, { dataless: false, inCloud: false }),
      index("video"),
    );
    assert.deepEqual(classify(join(folder, "cloud/a.pdf"), "pdf", DEFAULT_OPTIONS, false, facts), index("pdf"));
  });
});

describe("classifyCode (the code index)", () => {
  const kind = (name: string, body = "x") => classifyCode(write(join("code", name), body), DEFAULT_OPTIONS);

  test("reads source, a repo's docs and settings, and notebooks", () => {
    for (const name of [
      "retry.py",
      "App.swift",
      "README.md",
      "settings.yaml",
      "explore.ipynb",
      "Makefile",
      "Dockerfile.dev",
      "app.ts",
    ]) {
      assert.deepEqual(kind(name), index("code"), name);
    }
  });

  test("leaves out data, minified bundles, licenses and secrets", () => {
    assert.deepEqual(kind("package.json"), skip("data file"));
    assert.deepEqual(kind("rows.csv"), skip("data file"));
    assert.deepEqual(kind("yarn.lock"), skip("data file"));
    assert.deepEqual(kind("bundle.min.js"), skip("minified"));
    assert.deepEqual(kind("LICENSE.md"), skip("license"));
    assert.deepEqual(kind("prod.pem"), skip("key or password file"));
    assert.deepEqual(kind("id_ed25519"), skip("key or password file"));
    assert.deepEqual(kind("credentials.yaml"), skip("key or password file"));
    assert.deepEqual(kind("photo.jpg"), IGNORE);
    assert.deepEqual(classifyCode("/c/notes.md", { excludedExtensions: ["md"] }), skip("excluded type"));
  });

  test("a real MPEG transport stream named .ts is a video, not code", () => {
    assert.deepEqual(classifyCode(write("code/clip.ts", transportStream()), DEFAULT_OPTIONS), IGNORE);
  });
});

describe("names", () => {
  test("secrets are matched by extension and by prefix", () => {
    assert.equal(isSecret("server.KEY"), true);
    assert.equal(isSecret(".netrc"), true);
    assert.equal(isSecret("secretary.py"), true); // a prefix test, as in DigUp
    assert.equal(isSecret("notes.txt"), false);
    assert.equal(isSecret("my.env"), false);
  });

  test("extensions are read as Foundation reads them", () => {
    const cases: Array<[string, string, string]> = [
      ["a.txt", "txt", "a"],
      [".env", "", ".env"],
      [".env.local", "local", ".env"],
      ["a.", "", "a."],
      ["a.b c", "", "a.b c"],
      ["a.tar.gz", "gz", "a.tar"],
      ["Dockerfile", "", "Dockerfile"],
      ["a..b", "b", "a."],
      ["..a", "", "..a"],
      ["...a", "", "...a"],
      ["....b", "b", "..."],
      ["a.b c", "b c", "a"],
      ["._x", "", "._x"],
    ];
    for (const [name, ext, stem] of cases) {
      assert.equal(pathExtension(name), ext, name);
      assert.equal(deletingPathExtension(name), stem, name);
    }
  });

  test("paths split as NSString splits them", () => {
    // Checked against NSString on macOS 26.
    const parents: Array<[string, string]> = [
      ["/a/b", "/a"],
      ["/a", "/"],
      ["/", "/"],
      ["//", "/"],
      ["/a/b/", "/a"],
      ["a", ""],
      ["a/", ""],
      ["a/b", "a"],
      ["//a", "/"],
      ["/a//b", "/a"],
      ["///a///b///", "/a"],
      ["/a/./b", "/a/."],
      ["x/../y", "x/.."],
      ["", ""],
    ];
    for (const [path, parent] of parents) assert.equal(parentPath(path), parent, path);
    const lasts: Array<[string, string]> = [
      ["/a/b.txt", "b.txt"],
      ["/a/b/", "b"],
      ["/", "/"],
      ["//", "/"],
      ["///a///b///", "b"],
      ["a", "a"],
      ["", ""],
      ["/a/b/..", ".."],
    ];
    for (const [path, last] of lasts) assert.equal(lastPathComponent(path), last, path);
  });

  test("excluded extensions as people write them", () => {
    assert.deepEqual(parseExtensions("HEIC, .txt *.md"), ["heic", "txt", "md"]);
    assert.deepEqual(parseExtensions("  ,, "), []);
  });
});

describe("folders", () => {
  test("machine names", () => {
    assert.equal(looksMachineNamed("clip_000123"), true);
    assert.equal(looksMachineNamed("frame-0042"), true);
    assert.equal(looksMachineNamed("3f9a1c0e-12ab-4cde"), true);
    assert.equal(looksMachineNamed("000123"), true);
    assert.equal(looksMachineNamed("clip_٠٠١٢٣"), true); // ICU's \d is any digit
    assert.equal(looksMachineNamed("IMG_1234"), false);
    assert.equal(looksMachineNamed("PXL_20260101_123456789"), false);
    assert.equal(looksMachineNamed("Screenshot 2026-10-01 at 9.41.07 PM"), false);
    assert.equal(looksMachineNamed("Tokyo itinerary"), false);
  });

  test("a dataset needs many machine-named files", () => {
    const clips = Array.from({ length: 400 }, (_, i) => ({
      folder: "/x/clips",
      stem: `clip_${String(i).padStart(6, "0")}`,
      kind: "audio" as const,
    }));
    const photos = Array.from({ length: 400 }, (_, i) => ({
      folder: "/x/camera",
      stem: `IMG_${1000 + i}`,
      kind: "image" as const,
    }));
    const few = Array.from({ length: 50 }, (_, i) => ({ folder: "/x/few", stem: `clip_${i}`, kind: "audio" as const }));
    assert.deepEqual(datasetFolders([...clips, ...photos, ...few], new Set()), { "/x/clips": 400 });
    assert.deepEqual(datasetFolders(clips, new Set(["/x/clips"])), {}); // a chosen folder is never a dataset
  });

  test("changes count only where the crawl goes", () => {
    const home = "/Users/me";
    const walked = (path: string, root = home, excluded: string[] = []) => isWalked(path, root, home, excluded);
    assert.equal(walked("/Users/me/Documents/trip.pdf"), true);
    assert.equal(walked("/Users/me"), true);
    assert.equal(walked("/Users/me/Library/Application Support/DigUp/index.noindex/app.log"), false);
    assert.equal(walked("/Users/me/Library/Caches/com.apple.Safari/Cache.db"), false);
    assert.equal(walked("/Users/me/Projects/site/node_modules/left-pad/index.js"), false);
    assert.equal(walked("/Users/me/Movies/Exports.noindex/clip.mov"), false);
    assert.equal(walked("/Users/me/Documents/.git/index"), false);
    assert.equal(walked("/Users/me/Downloads/big.iso", home, ["/Users/me/Downloads"]), false);
    // A folder chosen inside ~/Library (iCloud Drive) is walked.
    const drive = "/Users/me/Library/Mobile Documents/com~apple~CloudDocs";
    assert.equal(walked(drive + "/Notes/plan.md", drive), true);
    assert.equal(walked("/Users/me/Documents/trip.pdf", drive), false);
    assert.equal(walked("/Users/me/Documentsx/a.pdf", "/Users/me/Documentsx"), true);
    assert.equal(walked("/Users/me/Documentsx/a.pdf", "/Users/me/Documents"), false);
  });

  test("skip reasons for folders", () => {
    assert.equal(skipReason("/u/p/node_modules", "/u", []), "developer folder");
    assert.equal(skipReason("/u/Exports.noindex", "/u", []), ".noindex folder");
    assert.equal(skipReason("/u/Library", "/u", []), "~/Library");
    assert.equal(skipReason("/u/a/Library", "/u", []), null);
    assert.equal(skipReason("/u/Old/2019", "/u", ["/u/Old"]), "excluded folder");
    assert.equal(skipReason("/u/Older", "/u", ["/u/Old"]), null);
  });

  test("a .git that can't be looked at isn't there, as for FileManager.fileExists", () => {
    const locked = join(folder, "locked");
    mkdirSync(join(locked, "inside"), { recursive: true });
    chmodSync(locked, 0o000);
    try {
      assert.equal(codeSkipReason(locked), null);
    } finally {
      chmodSync(locked, 0o755);
    }
    const loop = join(folder, "loop");
    mkdirSync(loop);
    symlinkSync(join(loop, ".git"), join(loop, ".git"));
    assert.equal(codeSkipReason(loop), null);
  });

  test("code skip reasons: vendored or built code, submodules and worktrees", () => {
    assert.equal(codeSkipReason("/r/vendor", null), "vendored or built code");
    assert.equal(codeSkipReason("/r/lib", "file"), "submodule or worktree");
    assert.equal(codeSkipReason("/r/lib", "dir"), null);
    const submodule = join(folder, "repo/sub");
    write("repo/sub/.git", "gitdir: ../.git/modules/sub\n");
    mkdirSync(join(folder, "repo/.git"), { recursive: true });
    assert.equal(codeSkipReason(submodule), "submodule or worktree");
    assert.equal(codeSkipReason(join(folder, "repo")), null);
  });

  test("paths are compared as Swift compares strings: an NFC name is the NFD one", () => {
    const nfc = "/Users/me/\u017d\u00e1dosti";
    const nfd = nfc.normalize("NFD");
    assert.notEqual(nfc, nfd);
    assert.equal(skipReason(nfd + "/2019", "/Users/me", [nfc]), "excluded folder");
    assert.equal(skipReason(nfd, "/Users/me", [nfc]), "excluded folder");
    assert.equal(skipReason("/Users/me/Library", "/Users/me".normalize("NFD"), []), "~/Library");
    assert.equal(isWalked(nfd + "/a.pdf", nfc, "/Users/me", []), true);
    assert.equal(isWalked(nfd + "/node_modules/a.js", nfc, "/Users/me", []), false);
    assert.equal(isWalked(nfc + "/sub/a.pdf", "/Users/me", "/Users/me", [nfd + "/sub"]), false);
    const kept = keepCandidates([{ path: nfd + "/assets/logo.png", kind: "image" as const }], {
      projectRoots: [nfc],
      roots: ["/Users/me"],
      code: false,
      includeDatasets: false,
    });
    assert.deepEqual(kept.skipped, { "inside a code project": 1 });
    const frames = (folder: string, from: number) =>
      Array.from({ length: 200 }, (_, i) => ({
        folder,
        stem: `frame_${String(from + i).padStart(5, "0")}`,
        kind: "image" as const,
      }));
    assert.deepEqual(datasetFolders([...frames(nfc, 0), ...frames(nfd, 200)], new Set()), { [nfc]: 400 });
  });

  test("project roots", () => {
    assert.equal(isProjectRoot(["src", "package.json"]), true);
    assert.equal(isProjectRoot([".git"]), true);
    assert.equal(isProjectRoot(["App.xcodeproj"]), true);
    assert.equal(isProjectRoot(["App.XCODEPROJ", "notes.txt"]), false);
    write("project/Cargo.toml");
    write("plain/notes.txt");
    assert.equal(isProjectRootFolder(join(folder, "project")), true);
    assert.equal(isProjectRootFolder(join(folder, "plain")), false);
    assert.equal(isProjectRootFolder(join(folder, "missing")), false);
  });
});

describe("keepCandidates", () => {
  const file = (path: string, kind: FileKind) => ({ path, kind });

  test("inside a code project only screenshots stay, the folders above included", () => {
    const found = [
      file("/h/app/assets/logo.png", "image"),
      file("/h/app/docs/spec.pdf", "pdf"),
      file("/h/app/shots/Screenshot 1.png", "screenshot"),
      file("/h/notes/plan.md", "doc"),
      file("/h/app2/readme.txt", "doc"),
    ];
    const { kept, skipped } = keepCandidates(found, {
      projectRoots: ["/h/app"],
      roots: ["/h"],
      code: false,
      includeDatasets: false,
    });
    assert.deepEqual(
      kept.map((f) => f.path),
      ["/h/app/shots/Screenshot 1.png", "/h/notes/plan.md", "/h/app2/readme.txt"],
    );
    assert.deepEqual(skipped, { "inside a code project": 2 });
  });

  test("a dataset folder loses its pictures, sound and video, not its documents", () => {
    const found = [
      ...Array.from({ length: 300 }, (_, i) => file(`/h/data/frame_${String(i).padStart(5, "0")}.png`, "image")),
      file("/h/data/Holiday.mov", "video"),
      file("/h/data/labels.txt", "doc"),
      file("/h/data/sub/x.png", "image"),
    ];
    const result = keepCandidates(found, { projectRoots: [], roots: ["/h"], code: false, includeDatasets: false });
    assert.deepEqual(result.datasets, { "/h/data": 300 });
    assert.deepEqual(
      result.kept.map((f) => f.path),
      ["/h/data/labels.txt", "/h/data/sub/x.png"],
    );
    assert.deepEqual(result.skipped, { dataset: 301 });
    const all = keepCandidates(found, { projectRoots: [], roots: ["/h"], code: false, includeDatasets: true });
    assert.equal(all.kept.length, found.length);
  });

  test("the code index keeps what the walk found", () => {
    const found = [file("/h/app/main.py", "code")];
    assert.deepEqual(
      keepCandidates(found, { projectRoots: ["/h/app"], roots: [], code: true, includeDatasets: false }).kept,
      found,
    );
  });
});

describe("FolderSelection", () => {
  test("unchecking a subfolder skips it", () => {
    const selection = new FolderSelection({ chosen: ["/D"] });
    selection.setSubfolder("/D/Courses", false);
    assert.deepEqual(selection.skipped, ["/D/Courses"]);
    assert.equal(selection.mark("/D"), "mixed");
    assert.equal(selection.isSearched("/D/Courses/week1.mp4"), false);
    assert.equal(selection.isSearched("/D/Books/a.pdf"), true);
    selection.setFolder("/D", true); // a click on a mixed checkbox: all of it
    assert.deepEqual(selection.skipped, []);
    assert.equal(selection.mark("/D"), "on");
  });

  test("checking a subfolder chooses it alone", () => {
    const selection = new FolderSelection();
    selection.setSubfolder("/D/Receipts", true);
    assert.deepEqual(selection.chosen, ["/D/Receipts"]);
    assert.equal(selection.mark("/D"), "mixed");
    assert.equal(selection.isSearched("/D/Receipts/may.pdf"), true);
    assert.equal(selection.isSearched("/D/other.pdf"), false);
    assert.deepEqual(selection.folders, ["/D/Receipts"]);
    selection.setFolder("/D", true);
    assert.deepEqual(selection.chosen, ["/D"]); // the subfolder is covered now
    selection.setFolder("/D", false);
    assert.deepEqual(selection.chosen, []);
    assert.equal(selection.mark("/D"), "off");
  });

  test("unchecking a folder drops its subfolder choices but not deeper skips", () => {
    const selection = new FolderSelection({ chosen: ["/D"], skipped: ["/D/A", "/D/B/old"] });
    selection.setFolder("/D", false);
    assert.deepEqual(selection.chosen, []);
    assert.deepEqual(selection.skipped, ["/D/B/old"]);
    assert.deepEqual(selection.effectiveSkips, []); // nothing around it is searched
  });

  test("a chosen folder inside a skipped one is searched whole", () => {
    const selection = new FolderSelection({ chosen: ["/D"], skipped: ["/D/Media"] });
    selection.setSubfolder("/D/Media/Courses", true);
    assert.deepEqual(selection.chosen, ["/D", "/D/Media/Courses"]);
    assert.equal(selection.isSearched("/D/Media/Courses/week1/a.mp4"), true);
    assert.equal(selection.isSearched("/D/Media/film.mp4"), false);
    assert.deepEqual(selection.folders, ["/D", "/D/Media/Courses"]); // not covered by /D: Media is skipped
    selection.setSubfolder("/D/Media/Courses/old", false);
    assert.equal(selection.isSearched("/D/Media/Courses/old/b.mp4"), false);
  });

  test("folders inside another chosen one are covered", () => {
    const selection = new FolderSelection({ chosen: ["/D/A", "/D", "/E"] });
    assert.deepEqual(selection.folders, ["/D", "/E"]);
    assert.equal(selection.searchedAs("/D/A/x.png"), "/D/A"); // the closest
    assert.equal(selection.searchedAs("/F/x.png"), null);
  });

  test("kept folders stay whatever is clicked", () => {
    const selection = new FolderSelection({ kept: ["/D/Receipts"] });
    assert.equal(selection.mark("/D"), "mixed");
    selection.setFolder("/D", true);
    assert.deepEqual(selection.folders, ["/D"]);
    selection.setFolder("/D", false);
    assert.deepEqual(selection.folders, ["/D/Receipts"]);
    assert.equal(selection.mark("/D"), "mixed");
  });

  test("checking a skipped folder takes the skip back", () => {
    const selection = new FolderSelection({ skipped: ["/H/Movies"], kept: ["/H"] });
    assert.equal(selection.isSearched("/H/Movies"), false);
    selection.setFolder("/H/Movies", true);
    assert.deepEqual(selection.skipped, []);
    assert.deepEqual(selection.chosen, []); // searched as part of /H again
    selection.setFolder("/H/Movies", false);
    assert.deepEqual(selection.skipped, ["/H/Movies"]);
    selection.unskip("/H/Movies");
    assert.equal(selection.isSearched("/H/Movies"), true);
  });

  test("paths are compared by whole names", () => {
    assert.equal(FolderSelection.isInside("/a/bc", "/a/b"), false);
    assert.equal(FolderSelection.isInside("/a/b/c", "/a/b"), true);
    assert.equal(new FolderSelection({ chosen: ["/a/b"] }).isSearched("/a/bc/x"), false);
  });

  test("and as Swift compares strings: an NFC name is the NFD one", () => {
    const nfc = "/Users/me/\u017d\u00e1dosti";
    const nfd = nfc.normalize("NFD");
    assert.equal(FolderSelection.isInside(nfd + "/2026/a.pdf", nfc), true);
    const selection = new FolderSelection({ chosen: [nfc, nfd], skipped: [nfd + "/old"] });
    assert.deepEqual(selection.chosen, [nfc]); // one folder
    assert.equal(selection.isSearched(nfd + "/new/a.pdf"), true);
    assert.equal(selection.isSearched(nfc + "/old/a.pdf"), false);
    assert.equal(selection.searchedAs(nfd + "/new/a.pdf"), nfc);
    selection.setSubfolder(nfd, false);
    assert.deepEqual(selection.chosen, []);
  });

  test("is a value: what it hands out never changes, and two with the same choices are equal", () => {
    const selection = new FolderSelection({ chosen: ["/D"] });
    const chosen = selection.chosen;
    const skipped = selection.skipped;
    selection.setSubfolder("/E/Receipts", true);
    selection.setSubfolder("/D/Old", false);
    assert.deepEqual(chosen, ["/D"]);
    assert.deepEqual(skipped, []);
    assert.deepEqual(selection.chosen, ["/D", "/E/Receipts"]);
    assert.ok(
      Object.isFrozen(selection.chosen) && Object.isFrozen(selection.skipped) && Object.isFrozen(selection.kept),
    );
    const same = new FolderSelection({ chosen: ["/D", "/E/Receipts"], skipped: ["/D/Old"] });
    assert.equal(selection.equals(same), true);
    assert.equal(selection.equals(new FolderSelection({ chosen: ["/E/Receipts", "/D"], skipped: ["/D/Old"] })), false);
    selection.unskip("/D/Old");
    assert.equal(selection.equals(same), false);
  });

  test("real paths are what a walk reports", () => {
    assert.equal(FolderSelection.realPath(folder), FolderSelection.realPath(FolderSelection.realPath(folder)));
    assert.equal(FolderSelection.realPath("/no/such/folder"), "/no/such/folder");
    if (existsSync("/private/var")) assert.equal(FolderSelection.realPath("/var"), "/private/var");
  });
});

describe("fileSystemForm (URL(fileURLWithPath:)'s form, DigUp's titles)", () => {
  const scalars = (text: string) => [...text].map((c) => c.codePointAt(0)!.toString(16)).join(" ");
  test("decomposes as Foundation does, keeping its exclusions and reordering marks across them", () => {
    // Each expected value is the hex of swiftc's URL(fileURLWithPath: "/Users/x/" + name).deletingPathExtension()
    // .lastPathComponent (Swift 6.3.1, macOS 26).
    const cases: Array<[string, string]> = [
      ["Résumé – João Müller", "52 65 301 73 75 6d 65 301 20 2013 20 4a 6f 61 303 6f 20 4d 75 308 6c 6c 65 72"],
      ["Übersicht Größe Maße", "55 308 62 65 72 73 69 63 68 74 20 47 72 6f 308 df 65 20 4d 61 df 65"],
      ["한국어 문서", "1112 1161 11ab 1100 116e 11a8 110b 1165 20 1106 116e 11ab 1109 1165"],
      ["\uf900 \u2126 \u212b \u00c5-v1.2", "f900 20 2126 20 212b 20 41 30a 2d 76 31 2e 32"],
      ["a\u0301\u20e8b", "61 20e8 301 62"],
      // Plain NFD would give "61 f71 f72 316 301 62": Foundation doesn't move marks across \u0f71\u0f72.
      ["a\u0301\u0f73\u0316b", "61 301 f71 f72 316 62"],
      ["ascii-name", "61 73 63 69 69 2d 6e 61 6d 65"],
    ];
    for (const [name, expected] of cases) assert.equal(scalars(fileSystemForm(name)), expected, name);
    // A path keeps its slashes; each part takes the form on its own.
    assert.equal(fileSystemForm("/Users/x/src/größe.py"), "/Users/x/src/gro\u0308\u00dfe.py");
  });
});
