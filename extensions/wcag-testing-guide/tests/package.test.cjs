const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const manifest = require("../package.json");

function assertPng512(iconName) {
  const file = path.join(root, "assets", iconName);
  assert.ok(fs.existsSync(file), `Missing icon: ${file}`);
  const png = fs.readFileSync(file);
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(png.readUInt32BE(16), 512);
  assert.equal(png.readUInt32BE(20), 512);
}

test("extension and commands explicitly use an existing 512 px PNG icon", () => {
  assertPng512(manifest.icon);
  for (const command of manifest.commands) {
    assertPng512(command.icon);
    assert.ok(fs.existsSync(path.join(root, "src", `${command.name}.tsx`)));
  }
});

test("main list entries have explicit icons and descriptive official W3C actions", () => {
  const ui = fs.readFileSync(path.join(root, "src/wcag-explorer.tsx"), "utf8");
  assert.ok(ui.includes('icon={Icon.Book}'));
  assert.ok(ui.includes('icon={Icon.Info}'));
  assert.ok(ui.includes('icon={Icon.QuestionMark}'));
  assert.match(ui, /<ActionPanel\.Section title="Official W3C Resources">/);
  assert.match(ui, /<Action\.OpenInBrowser\s+title="W3C Understanding Guide"/);
  assert.match(ui, /<Action\.OpenInBrowser\s+title="Normative WCAG Criterion"/);
  assert.match(ui, /<Action\.OpenInBrowser\s+title="W3C Quick Reference"/);
  assert.match(ui, /<Action\.OpenInBrowser\s+title="WCAG2ICT for Native Apps"/);
  assert.doesNotMatch(ui, /title="External Link"/);
});

test("support links live in About Me, with meaningful action labels", () => {
  const ui = fs.readFileSync(path.join(root, "src/wcag-explorer.tsx"), "utf8");
  const aboutView = ui.split("function AboutMeItem")[1].split("export default function Command")[0];
  const criterionView = ui.split("function CriterionItem")[1].split("function AboutWcagItem")[0];
  assert.match(aboutView, /<Action\s+title="Buy Me a Coffee \(Optional\)"/);
  assert.match(aboutView, /<Action\s+title="Visit Cats & Tests Blog"/);
  assert.doesNotMatch(aboutView, /<Action.OpenInBrowser\s+title="Buy Me a Coffee/);
  assert.doesNotMatch(criterionView, /supportUrl|Buy Me a Coffee/);
});

test("official W3C references remain accessible in full guides", () => {
  const { criteria } = require("../scripts/load-typescript.cjs").loadModule("src/data.ts");
  const { criterionMarkdown } = require("../scripts/load-typescript.cjs").loadModule("src/guide.ts");
  for (const criterion of criteria) {
    const version = criterion.introduced === "2.2" ? "2.2" : "2.1";
    const guide = criterionMarkdown(criterion, version);
    assert.match(guide, /## Official W3C resources/);
    assert.match(guide, /https:\/\/www\.w3\.org\/TR\/WCAG/);
  }
});
