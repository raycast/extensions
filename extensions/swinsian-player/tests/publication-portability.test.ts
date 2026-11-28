import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");

function sourceText(): string {
  const files = fs
    .readdirSync(path.join(projectRoot, "src"), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
    .map((entry) => fs.readFileSync(path.join(entry.parentPath, entry.name), "utf8"));
  return files.join("\n");
}

test("public extension source contains no personal machine paths", () => {
  const source = sourceText();
  for (const forbidden of ["/Users/rd/", "/Volumes/Eksternal", "/opt/homebrew/"]) {
    assert(!source.includes(forbidden), `found personal path: ${forbidden}`);
  }
});

test("private integrations are absent while public Discovery links remain", () => {
  const source = sourceText();
  const removedSymbols = [
    "openCovCoverArt",
    "fetchMetalArchivesImages",
    "fetchAudioDBImages",
    "generateArtistBio",
    "openCurrentAlbumInLyricsFinder",
    "openCurrentAlbumInMp3tag",
    "searchDeemix",
    "createClippedDynamicReel",
    "createBloggerDraft",
    "downloadMissingReleases",
    "embedMetallumLyrics",
    "getTrackNumberingReport",
    "getAudioAgentAuditReport",
    "copyAudioDbJSON",
    "saveAudioDbMarkdown",
  ];
  for (const symbol of removedSymbols) {
    assert(!source.includes(symbol), `found removed integration: ${symbol}`);
  }

  const toolbox = fs.readFileSync(path.join(projectRoot, "src/toolbox.ts"), "utf8");
  assert.match(toolbox, /\[\s*"cov",/);
  assert.match(toolbox, /covers\.musichoarders\.xyz/);
  assert.match(toolbox, /id: "audiodb"/);
  assert.match(toolbox, /theaudiodb\.com\/search\.php/);
  assert(!toolbox.includes("/api/v1/json/"));
});

test("public menu labels and Swinsian window commands match the product UI", () => {
  const source = sourceText();
  const menuBar = fs.readFileSync(path.join(projectRoot, "src/nowPlayingMenuBar.tsx"), "utf8");
  const swinsian = fs.readFileSync(path.join(projectRoot, "src/helpers/swinsian.ts"), "utf8");

  assert(!source.includes("Covers & Images"), "legacy Covers & Images label is still present");
  assert(source.includes('title="Covers"'), "Covers label is missing");
  assert(swinsian.includes("key code 18 using command down"), "Main Window shortcut is missing");
  assert(swinsian.includes("key code 19 using command down"), "Mini Window shortcut is missing");
  assert(!menuBar.includes('title="Copy"'), "legacy Copy submenu is still present");
  assert.equal(
    (menuBar.match(/title="Tools"/g) || []).length,
    1,
    "menu bar should expose one consolidated Tools submenu",
  );
  assert(menuBar.includes('<MenuBarExtra.Section title="Reports">'), "Reports are missing from Tools");
});

test("Store metadata and boundary-safe integrations are present", () => {
  const metadata = fs.readdirSync(path.join(projectRoot, "metadata")).filter((entry) => /\.png$/i.test(entry));
  assert(metadata.length >= 2, "Store metadata needs at least two screenshots");

  const swinsian = fs.readFileSync(path.join(projectRoot, "src/helpers/swinsian.ts"), "utf8");
  assert(swinsian.includes('execFileAsync("/usr/bin/open", ["-R", filePath])'));
  assert(!swinsian.includes("execAsync(`open"), "Finder paths must not pass through a shell");
  assert(swinsian.includes("make new playlist with properties {name:item 1 of argv}"));
  assert(swinsian.includes('(album artist is "") and (artist is artistName)'));
});
