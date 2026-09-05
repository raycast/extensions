import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Hit, Row, SessionMeta } from "../src/lib/types";

/**
 * The dropdown the manifest actually ships, by preference name. Lives here
 * rather than in a test file because importing one test module from another
 * registers its tests a second time.
 */
export function manifestDropdown(
  name: string,
): { title: string; value: string }[] {
  // Relative to the extension root, which is where npm runs the suite from.
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  const pref = manifest.preferences.find(
    (p: { name: string }) => p.name === name,
  );
  assert.equal(pref.type, "dropdown", `${name} must stay a curated dropdown`);
  assert.equal(pref.required, true, `${name} must stay required`);
  return pref.data;
}

let counter = 0;

/**
 * A SessionMeta with every field populated. The pure functions under test read
 * only a few of them, so each test overrides just what it cares about.
 */
export function session(over: Partial<SessionMeta> = {}): SessionMeta {
  counter++;
  return {
    key: `k${counter}`,
    id: `id-${counter}`,
    agent: "claude",
    file: `/transcripts/${counter}.jsonl`,
    cwd: "/root/project",
    project: "project",
    title: `title ${counter}`,
    size: 0,
    mtimeMs: 0,
    offset: 0,
    seq: 0,
    ...over,
  };
}

export function hit(words: number, span: number): Hit {
  return { text: "", seq: 0, words, span };
}

export function row(over: Partial<SessionMeta>, h?: Hit): Row {
  return { session: session(over), hit: h };
}
