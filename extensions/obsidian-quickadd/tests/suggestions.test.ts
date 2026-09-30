import { mkdtempSync, utimesSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { loadLinkTargets, loadTags } from "../src/suggestions";
import { fakeCli, sq } from "./helpers/fakeCli";

function vault(files: Record<string, number>): string {
  const root = mkdtempSync(join(tmpdir(), "qa-sugg-"));
  for (const [name, mtime] of Object.entries(files)) {
    writeFileSync(join(root, name), "");
    utimesSync(join(root, name), mtime, mtime);
  }
  return root;
}

// Fake obsidian-cli: answers `files`, `aliases verbose` and `tags …` like the real one.
const cli = fakeCli(`case "$2" in
  files) printf 'Old.md\\nNew.md\\npic.png\\n' ;;
  aliases) printf 'Newest\\tNew.md\\n' ;;
  tags) printf '%s' ${sq('[{"tag":"#math","count":"3"},{"tag":"#idea","count":"1"}]')} ;;
esac`);

describe("loadLinkTargets", () => {
  it("uses Obsidian's files and aliases when the CLI is available", async () => {
    const root = vault({ "Old.md": 1000, "New.md": 3000, "pic.png": 2000 });
    const targets = await loadLinkTargets({ vaultPath: root, vaultName: "v", cli });
    expect(targets.map((t) => t.link)).toEqual(["New", "New|Newest", "pic.png", "Old"]);
  });

  it("scans the vault itself without the CLI", async () => {
    const root = vault({ "Old.md": 1000, "New.md": 3000, "pic.png": 2000 });
    const targets = await loadLinkTargets({ vaultPath: root, vaultName: "v" });
    expect(targets.map((t) => t.link)).toEqual(["New", "Old"]);
  });

  it("falls back to scanning when the CLI fails", async () => {
    const root = vault({ "Only.md": 1000 });
    const broken = fakeCli(`printf 'Command line interface is not enabled.'`);
    expect((await loadLinkTargets({ vaultPath: root, vaultName: "v", cli: broken })).map((t) => t.link)).toEqual([
      "Only",
    ]);
  });
});

describe("loadTags", () => {
  it("asks Obsidian for tags, most used first", async () => {
    expect(await loadTags({ vaultPath: "/x", vaultName: "v", cli })).toEqual([
      { tag: "math", count: 3 },
      { tag: "idea", count: 1 },
    ]);
  });

  it("has no tags without the CLI", async () => {
    expect(await loadTags({ vaultPath: "/x", vaultName: "v" })).toEqual([]);
  });
});

describe("loadLinkTargets with Obsidian's file settings", () => {
  it("hides unsupported file types unless the vault shows them", async () => {
    const root = vault({ "Old.md": 1000, "New.md": 3000, "pic.png": 2000 });
    const withScript = fakeCli(
      `case "$2" in files) printf 'New.md\\nrun.sh\\n' ;; aliases) printf 'No aliases found.' ;; esac`,
    );
    expect((await loadLinkTargets({ vaultPath: root, vaultName: "v", cli: withScript })).map((t) => t.link)).toEqual([
      "New",
    ]);
    const { mkdirSync } = await import("fs");
    mkdirSync(join(root, ".obsidian"));
    writeFileSync(join(root, ".obsidian/app.json"), JSON.stringify({ showUnsupportedFiles: true }));
    expect((await loadLinkTargets({ vaultPath: root, vaultName: "v", cli: withScript })).map((t) => t.link)).toEqual([
      "New",
      "run.sh",
    ]);
  });
});

describe("loadLinkTargets without the CLI", () => {
  it("applies Obsidian's excluded files to the vault scan", async () => {
    const root = vault({ "Keep.md": 1000 });
    const { mkdirSync } = await import("fs");
    mkdirSync(join(root, "Archive"));
    writeFileSync(join(root, "Archive/Old.md"), "");
    mkdirSync(join(root, ".obsidian"));
    writeFileSync(join(root, ".obsidian/app.json"), JSON.stringify({ userIgnoreFilters: ["Archive/"] }));
    expect((await loadLinkTargets({ vaultPath: root, vaultName: "v" })).map((t) => t.link)).toEqual(["Keep"]);
  });

  it("picks link text after excluding files, so a kept note isn't lengthened by an excluded namesake", async () => {
    const root = vault({});
    const { mkdirSync } = await import("fs");
    for (const dir of ["Projects", "Archive", ".obsidian"]) mkdirSync(join(root, dir));
    writeFileSync(join(root, "Projects/A.md"), "");
    writeFileSync(join(root, "Archive/A.md"), "");
    writeFileSync(join(root, ".obsidian/app.json"), JSON.stringify({ userIgnoreFilters: ["Archive/"] }));
    expect((await loadLinkTargets({ vaultPath: root, vaultName: "v" })).map((t) => [t.link, t.subtitle])).toEqual([
      ["A", "Projects"],
    ]);
  });
});
