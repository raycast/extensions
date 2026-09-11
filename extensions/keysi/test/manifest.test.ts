import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Checks the real `package.json`, the real icon and the real changelog
 * against what the Raycast Store requires, rather than a fixture — same
 * reasoning as `sheets.test.ts`. The manifest is the one file whose
 * correctness is defined entirely by somebody else's schema, and the failure
 * mode is not a crash: it is a rejected store submission, days later, after
 * a human reviewer noticed. These exist so that lands here instead.
 *
 * Requirements verified against Raycast's docs and published schema on
 * 2026-09-11. `ray lint` checks some of this, but not the parts that matter
 * most here — it does not care that `platforms` says macOS, and it never
 * looks at the changelog at all.
 */
const ROOT = join(import.meta.dirname, "..");

const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as Record<string, unknown>;

/** The `required` array of https://www.raycast.com/schemas/extension.json. */
const REQUIRED_FIELDS = ["name", "title", "description", "icon", "author", "license", "commands", "dependencies"];

/** The schema's category enum. Anything outside it fails store validation. */
const CATEGORIES = [
  "Applications",
  "Communication",
  "Data",
  "Documentation",
  "Design Tools",
  "Developer Tools",
  "Finance",
  "Fun",
  "Media",
  "News",
  "Productivity",
  "Security",
  "System",
  "Web",
  "Other",
];

const MODES = ["view", "no-view", "menu-bar"];

interface Command {
  name: string;
  title: string;
  description?: string;
  mode: string;
}

const commands = manifest.commands as Command[];

test("every field the store schema requires is present", () => {
  const missing = REQUIRED_FIELDS.filter((field) => manifest[field] === undefined);
  assert.deepEqual(missing, []);
});

test("the licence is MIT, which the store requires", () => {
  assert.equal(manifest.license, "MIT");
});

/**
 * The author field is a Raycast account handle, not a name or an email —
 * publishing under a handle that does not exist fails at review.
 */
test("the author is a bare handle", () => {
  assert.match(manifest.author as string, /^[a-z0-9_-]+$/i);
});

test("categories are all in the store's enum", () => {
  const categories = manifest.categories as string[];
  assert.ok(categories.length > 0, "at least one category is required");
  for (const category of categories) {
    assert.ok(CATEGORIES.includes(category), `"${category}" is not a Raycast category`);
  }
});

/**
 * Raycast runs on Windows too, and an extension that does not say otherwise
 * is offered there. Every one of these commands is macOS-only in a way that
 * cannot be worked around: two of them drive a macOS app over `keysi://`,
 * and the third reads `~/Library/Application Support`. Without this field a
 * Windows user can install it and get three commands that cannot work.
 */
test("the extension is declared macOS-only", () => {
  assert.deepEqual(manifest.platforms, ["macOS"]);
});

test("every command has a mode the schema allows", () => {
  for (const command of commands) {
    assert.ok(MODES.includes(command.mode), `${command.name} has mode "${command.mode}"`);
  }
});

/** A command's `name` is the entry point's filename; a typo builds nothing. */
test("every command name resolves to a source file", () => {
  for (const command of commands) {
    const candidates = [`${command.name}.tsx`, `${command.name}.ts`];
    const found = candidates.some((file) => existsSync(join(ROOT, "src", file)));
    assert.ok(found, `no src file for command "${command.name}"`);
  }
});

test("command titles and descriptions are non-empty", () => {
  for (const command of commands) {
    assert.ok(command.title?.length > 0, `${command.name} has no title`);
    assert.ok(command.description && command.description.length > 0, `${command.name} has no description`);
  }
});

/**
 * Raycast's naming guidance is `<verb> <noun>` or `<noun>`, with no articles.
 * Only the articles are worth asserting: they are unambiguous, and they are
 * the thing a reviewer sends the PR back over.
 */
test("command titles do not open with an article", () => {
  for (const command of commands) {
    assert.doesNotMatch(command.title, /^(a|an|the)\s/i, `${command.name}: "${command.title}"`);
  }
});

/**
 * Reads the IHDR chunk rather than shelling out to `sips`, so the check runs
 * the same way everywhere. A PNG's width and height are two big-endian
 * uint32s at a fixed offset, immediately after the 8-byte signature and the
 * 8 bytes of chunk length plus type.
 */
function pngSize(path: string): { width: number; height: number } {
  const buffer = readFileSync(path);
  const signature = buffer.subarray(0, 8).toString("hex");
  assert.equal(signature, "89504e470d0a1a0a", `${path} is not a PNG`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test("the icon is a 512x512 PNG", () => {
  const icon = manifest.icon as string;
  const path = join(ROOT, "assets", icon);
  assert.ok(existsSync(path), `${icon} is missing from assets/`);
  assert.deepEqual(pngSize(path), { width: 512, height: 512 });
});

test("a changelog exists and its newest entry is shaped the way the store parses", () => {
  const path = join(ROOT, "CHANGELOG.md");
  assert.ok(existsSync(path), "CHANGELOG.md is required for the store");
  const heading = readFileSync(path, "utf8")
    .split("\n")
    .find((line) => line.startsWith("## "));
  assert.ok(heading, "no ## entry in the changelog");
  // Either the literal placeholder, which Raycast substitutes when the PR is
  // merged, or a date already substituted by a previous release.
  assert.match(heading, /^## \[.+\] - (\{PR_MERGE_DATE\}|\d{4}-\d{2}-\d{2})$/, heading);
});

/**
 * Screenshots cannot be produced from a script — they need a running Raycast
 * with this extension loaded. This does not fail when they are absent, since
 * that would mean a permanently red suite for something no commit can fix.
 * It fails when one is present at the wrong size, which is the mistake that
 * is actually made: hand-screenshotting instead of using Window Capture.
 */
test("any screenshot present is 2000x1250", async (t) => {
  const dir = join(ROOT, "metadata");
  const { readdirSync } = await import("node:fs");
  const shots = existsSync(dir) ? readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png")) : [];
  if (shots.length === 0) {
    t.skip("no screenshots yet — the owner takes these against a running Raycast");
    return;
  }
  assert.ok(shots.length <= 6, `the store takes at most six screenshots, found ${shots.length}`);
  for (const shot of shots) {
    assert.deepEqual(pngSize(join(dir, shot)), { width: 2000, height: 1250 }, shot);
  }
});
