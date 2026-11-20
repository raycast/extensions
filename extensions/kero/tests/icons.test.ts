import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { getPaneIcon, KERO_ICONS, PROGRAM_ICONS } from "../src/lib/icons";
import { buildGroups, parseSessions } from "../src/lib/model";

const assets = join(__dirname, "../assets");

test("program icons follow Kero's agent, process, runtime priority", () => {
  assert.equal(getPaneIcon({ agent: "claude", process: "node", runtime: "python" }).source, "kero/si-claude.svg");
  assert.equal(getPaneIcon({ agent: "pi", process: "python3", runtime: "node" }).source, "kero/si-python.svg");
  assert.equal(getPaneIcon({ agent: "pi", process: "pi", runtime: "node" }).source, "kero/si-nodedotjs.svg");
  assert.equal(getPaneIcon({ agent: "codex" }).source, "kero/si-openai.svg");
  assert.equal(getPaneIcon({ process: "cursor-agent" }).source, "kero/si-cursor.svg");
});

test("browser panes use the globe even when an agent is present", () => {
  assert.equal(getPaneIcon({ url: "about:blank", agent: "claude" }).source, KERO_ICONS.globe);
  assert.equal(getPaneIcon({ url: "https://example.com" }).source, KERO_ICONS.globe);
  assert.equal(getPaneIcon({ url: "", process: "zsh" }).source, KERO_ICONS.terminal);
});

test("shells and unknown programs safely fall back to the terminal icon", () => {
  for (const process of [undefined, "zsh", "fish", "unknown", "constructor", "__proto__"]) {
    assert.equal(getPaneIcon({ process }).source, KERO_ICONS.terminal);
  }
});

test("agent brand colors and exited muting mirror Kero independently of task status", () => {
  assert.equal(getPaneIcon({ agent: "claude", status: "working" }).tint, "#d97757");
  assert.equal(getPaneIcon({ agent: "gemini", status: "waiting" }).tint, "#3186ff");
  assert.equal(getPaneIcon({ agent: "claude", status: "error" }).tint, "#d97757");
  assert.equal(getPaneIcon({ agent: "claude", status: "exited" }).tint, "secondary");
  assert.equal(getPaneIcon({ agent: "pi", runtime: "node" }).tint, "primary");
  assert.equal(getPaneIcon({ process: "node" }).tint, "secondary");
  assert.equal(getPaneIcon({}).tint, "secondary");
});

test("JSON parsing preserves runtime/browser identity through list normalization", () => {
  const sessions = parseSessions([
    {
      id: "session",
      panes: [
        { id: "pi", agent: "pi", process: "pi", runtime: "node" },
        { id: "browser", url: "about:blank" },
        { id: "invalid", runtime: 42, url: false },
      ],
    },
  ]);
  const items = buildGroups(sessions, [])[0].items;
  assert.equal(items[0].icon.source, "kero/si-nodedotjs.svg");
  assert.ok(items[0].keywords.includes("node"));
  assert.equal(items[1].icon.source, KERO_ICONS.globe);
  assert.equal(items[2].icon.source, KERO_ICONS.terminal);
  assert.equal(sessions[0].panes[2].runtime, undefined);
  assert.equal(sessions[0].panes[2].url, undefined);
});

test("every referenced SVG is bundled and no unused SVG is shipped", () => {
  const used = new Set([...Object.values(KERO_ICONS), ...PROGRAM_ICONS.values()]);
  const bundled = new Set(readdirSync(join(assets, "kero")).map((file) => `kero/${file}`));
  assert.deepEqual(bundled, used);
  for (const source of used) {
    const svg = readFileSync(join(assets, source), "utf8");
    assert.match(svg, /<svg\s/);
    assert.match(svg, /viewBox=/);
    assert.match(svg, /currentColor/);
    assert.doesNotMatch(svg, /<script\b|<image\b|<foreignObject\b|\bonload=/i);
  }
});

test("application icon is a 512px PNG and redistribution licenses are included", () => {
  const png = readFileSync(join(assets, "extension-icon.png"));
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(png.readUInt32BE(16), 512);
  assert.equal(png.readUInt32BE(20), 512);
  for (const name of [
    "Kero-MIT.txt",
    "Framework7-MIT.txt",
    "Meteor-MIT.txt",
    "Simple-Icons-CC0.txt",
    "CC-BY-3.0.txt",
    "Deno-MIT.txt",
    "GitHub-Octicons-MIT.txt",
  ]) {
    assert.ok(readFileSync(join(assets, "licenses", name), "utf8").length > 500);
  }
});

test("distributed notices inventory every program icon once and link every bundled license", () => {
  const notice = readFileSync(join(assets, "licenses/NOTICE.md"), "utf8");
  const inventoried = [...notice.matchAll(/^\| `(kero\/si-[^`]+\.svg)`\s+\|/gm)].map((match) => match[1]);
  assert.deepEqual(inventoried.sort(), [...new Set(PROGRAM_ICONS.values())].sort());

  const linkedLicenses = new Set([...notice.matchAll(/\]\(([A-Za-z0-9.-]+\.txt)\)/g)].map((match) => match[1]));
  const bundledLicenses = readdirSync(join(assets, "licenses")).filter((name) => name.endsWith(".txt"));
  assert.deepEqual([...linkedLicenses].sort(), bundledLicenses.sort());
  assert.match(notice, /Git Logo by Jason Long/);
  assert.match(notice, /Copyright \(c\) 2018-2024 the Deno authors/);
  assert.match(notice, /Copyright \(c\) 2026 GitHub Inc\./);
});

test("program icons with identified copyright licenses retain their reviewed SVG bytes", () => {
  // Replacing one of these SVGs requires reviewing its provenance and notices again.
  // These hashes verify the reviewed artifact, not legal permission for its use.
  const reviewed = {
    "si-git.svg": "541eb699337be0bfbd0472f3c23515fb4eb2cc3b19bc3c959e793dee2eee4aaa",
    "si-deno.svg": "7d120032154e55535f4b6a8784fcadbeecde8c27ec8b0d43a76a7b5bac9ce38c",
    "si-githubcopilot.svg": "3dceb0d5f764bda01e573cb71124500ceb9b37555e6f060052a67829281358fe",
  };
  for (const [name, expected] of Object.entries(reviewed)) {
    const actual = createHash("sha256")
      .update(readFileSync(join(assets, "kero", name)))
      .digest("hex");
    assert.equal(actual, expected, name);
  }
});
