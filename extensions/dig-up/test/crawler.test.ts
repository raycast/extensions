// The crawl (engine/crawler.ts) through the real Swift helper: DigUp's RulesTests and CodeTests crawl cases, and the
// testbed's traps (.testbed, gitignored: those tests skip without it).

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, describe, it } from "node:test";
import { crawl, findGit, GitRepos } from "../engine/crawler";
import { Helper } from "../engine/helper";
import { silentLog } from "../engine/log";
import { DEFAULT_OPTIONS, type IndexOptions } from "../engine/types";

const repo = resolve(import.meta.dirname, "..");
const bin = join(repo, "assets/digup-helper");
const traps = join(repo, ".testbed/traps");
const noHelper = existsSync(bin) ? false : `${bin} is missing: build it with scripts/build-helper.sh`;
const noTraps = existsSync(traps) ? false : `${traps} is missing (DigUp's eval testbed)`;
const git = findGit();
const noGit = git ? false : "no git on this Mac";

const helper = new Helper(bin, silentLog);
after(() => helper.close());

const temps: string[] = [];
after(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});
function tempDir(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "dig-up-crawl-")));
  temps.push(dir);
  return dir;
}

function write(root: string, path: string, body: string | Buffer = "x"): string {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
  return file;
}

const codeOptions: IndexOptions = { ...DEFAULT_OPTIONS, code: true };

async function names(roots: string[], options: IndexOptions = DEFAULT_OPTIONS, base = roots[0]) {
  const report = await crawl(roots, options, { helper });
  return { report, names: report.candidates.map((file) => file.path.slice(base.length + 1)).sort() };
}

describe("the main index's crawl", { skip: noHelper }, () => {
  it("leaves out the testbed's traps as DigUp does", { skip: noTraps }, async () => {
    const { report, names: found } = await names([traps]);
    assert.deepEqual(
      found,
      [
        "Names with spaces & ünïcödé/Café menü — 日本語.jpg",
        "Names with spaces & ünïcödé/Screenshot 2026-10-05 at 9.41.07 PM.png",
        "MyProject/screenshots/Screenshot 2026-10-02 at 8.15.40 AM.png",
        "duplicates/penguin copy.jpg",
        "duplicates/penguin.jpg",
        "icons/target-128.png",
        "icons/target-32.png",
        "icons/target-64.png",
        "real-mpeg-ts/zoo clip.ts",
      ].sort(),
    );
    const kinds = Object.fromEntries(report.candidates.map((file) => [file.path.slice(traps.length + 1), file.kind]));
    assert.equal(kinds["real-mpeg-ts/zoo clip.ts"], "video"); // a real transport stream; app.ts and main.mts are not
    assert.equal(kinds["MyProject/screenshots/Screenshot 2026-10-02 at 8.15.40 AM.png"], "screenshot");
    assert.equal(kinds["duplicates/penguin.jpg"], "image");
    assert.deepEqual(report.skipped, {
      "app or bundle": 1, // Fake.app
      "code or data file": 3, // ts-code/app.ts, ts-code/main.mts, MyProject/package.json
      "inside a code project": 1, // MyProject/assets/hero.jpg
      dataset: 600, // dataset_clips
    });
    assert.deepEqual(report.skippedFolders, { "developer folder": 2 }); // node_modules, MyProject/node_modules
    assert.deepEqual(report.datasets, { [join(traps, "dataset_clips")]: 600 });
  });

  it("walks a folder chosen inside another one once", async () => {
    const root = tempDir();
    write(root, "inner/trip.txt", "notes about the trip");
    const { names: found } = await names([root, join(root, "inner")]);
    assert.deepEqual(found, ["inner/trip.txt"]);
  });

  // On a chosen root the same rule holds, but a temporary folder can't show it: the walk notes the root as /var/...
  // and reports its files as /private/var/..., in DigUp's crawl too.
  it("takes only screenshots from a code project", async () => {
    const root = tempDir();
    write(root, "app/package.json", "{}");
    write(root, "app/docs/notes.md", "# notes");
    write(root, "app/Screenshot 2026-01-01 at 10.00.00.png", "png");
    write(root, "trip.md", "# trip");
    const { report, names: found } = await names([root]);
    assert.deepEqual(found, ["app/Screenshot 2026-01-01 at 10.00.00.png", "trip.md"]);
    assert.equal(report.skipped["inside a code project"], 1);
    assert.equal(report.skipped["code or data file"], 1); // package.json
  });

  it("skips excluded folders and types, links, hidden files and developer folders", async () => {
    const root = tempDir();
    write(root, "keep/a.txt", "a");
    write(root, "keep/b.heic", "b");
    write(root, "Skip me/c.txt", "c");
    write(root, ".hidden/d.txt", "d");
    write(root, "node_modules/e.txt", "e");
    write(root, "box.noindex/f.txt", "f");
    symlinkSync(join(root, "keep/a.txt"), join(root, "keep/link.txt"));
    const options = { ...DEFAULT_OPTIONS, excludedFolders: [join(root, "Skip me")], excludedExtensions: ["heic"] };
    const { report, names: found } = await names([root], options);
    assert.deepEqual(found, ["keep/a.txt"]);
    assert.equal(report.skipped["excluded type"], 1);
    assert.equal(report.skipped["link or special file"], 1);
    assert.deepEqual(report.skippedFolders, { "excluded folder": 1, "developer folder": 1, ".noindex folder": 1 });
  });

  it("finds datasets: 300 machine-named clips in one folder", async () => {
    const root = tempDir();
    for (let n = 0; n < 300; n++) write(root, `clips/clip_${String(n).padStart(6, "0")}.wav`, "RIFF");
    write(root, "clips/notes.txt", "about the clips");
    const { report, names: found } = await names([root]);
    assert.deepEqual(found, ["clips/notes.txt"]);
    assert.equal(report.skipped.dataset, 300);
  });
});

describe("the code index's crawl", { skip: noHelper || noGit }, () => {
  const run = (cwd: string, ...args: string[]) => execFileSync(git!, ["-C", cwd, ...args], { stdio: "ignore" });

  it("keeps what git keeps (DigUp: CodeTests.codeCrawlKeepsWhatGitKeeps)", async () => {
    const root = tempDir();
    write(root, "app/main.py", "print(1)\n");
    write(root, "app/README.md", "# App\n");
    write(root, "app/.gitignore", "build/\n*.log\nscratch.py\n");
    write(root, "app/scratch.py", "x = 1\n"); // ignored by git
    write(root, "app/notes/todo.md", "- ship\n"); // new, not ignored: kept
    write(root, "app/build/out.py", "x = 2\n"); // a built folder
    write(root, "app/vendor/lib/core.py", "x = 3\n"); // vendored
    write(root, "app/node_modules/pad/index.js", "x\n"); // a dependency
    write(root, "app/data.json", "{}\n"); // data
    write(root, "app/big.py", "x = 1\n".repeat(200_000)); // 1.2 MB: made by a program
    write(root, "app/sub/.git", "gitdir: ../.git/modules/sub\n"); // a submodule
    write(root, "app/sub/lib.py", "x = 4\n");
    write(root, "loose/backup.sh", "rsync\n"); // not in a repo: everything code counts
    run(join(root, "app"), "init", "-q");
    const { report, names: found } = await names([root], codeOptions);
    assert.deepEqual(found, ["app/README.md", "app/main.py", "app/notes/todo.md", "loose/backup.sh"]);
    assert.equal(report.skipped["ignored by git"], 1);
    assert.equal(report.skipped["too big to be written by hand"], 1);
    assert.equal(report.skipped["data file"], 1);
    assert.equal(report.skippedFolders["vendored or built code"], 2);
    assert.equal(report.skippedFolders["submodule or worktree"], 1);
    assert.equal(report.skippedFolders["developer folder"], 1);
    // A repo's subfolder chosen on its own still follows the repo's .gitignore.
    const sub = await crawl([join(root, "app")], codeOptions, { helper });
    assert.ok(!sub.candidates.some((file) => file.path.endsWith("scratch.py")));
    // The main index never takes code from a code project (only its screenshots).
    assert.deepEqual((await names([root])).names, []);
  });

  it("counts everything when git can't say", async () => {
    const root = tempDir();
    write(root, "app/main.py", "print(1)\n");
    write(root, "app/.gitignore", "scratch.py\n");
    write(root, "app/scratch.py", "x = 1\n");
    run(join(root, "app"), "init", "-q");
    const report = await crawl([root], codeOptions, { helper, git: null });
    assert.deepEqual(report.candidates.map((file) => file.path.slice(root.length + 1)).sort(), [
      "app/main.py",
      "app/scratch.py",
    ]);
  });

  it("a notebook may be 20 MB, other code 1 MB", async () => {
    const root = tempDir();
    write(root, "big.ipynb", Buffer.alloc(2 << 20, 0x20));
    write(root, "huge.ipynb", Buffer.alloc(21 << 20, 0x20));
    const { report, names: found } = await names([root], codeOptions);
    assert.deepEqual(found, ["big.ipynb"]);
    assert.equal(report.skipped["too big to be written by hand"], 1);
  });

  it("matches git's names under canonical equivalence", async () => {
    const repos = new GitRepos(git);
    const root = tempDir();
    const decomposed = "Café.py";
    write(root, decomposed, "x = 1\n");
    run(root, "init", "-q");
    await repos.enterRoot(root);
    assert.equal(repos.ignores(join(root, decomposed)), false);
    assert.equal(repos.ignores(join(root, "Café.py")), false);
  });
});
