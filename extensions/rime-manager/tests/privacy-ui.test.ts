import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

test("saved block and lower rule values render only after local authentication", async () => {
  const source = await readFile(join(process.cwd(), "src", "remove-candidates.tsx"), "utf8");
  assert.match(source, /useState\(false\)/);
  assert.match(source, /title=\{isRevealed \? rule\.value : title\}/);
  assert.match(source, /closeMainWindow\(\{ popToRootType: PopToRootType\.Suspended \}\)/);
  assert.match(source, /authenticateToRevealRules\(\)[\s\S]*setIsRevealed\(true\)/);
  assert.match(source, /consumeRevealGrant\(\)[\s\S]*setIsRevealed\(true\)/);
  assert.doesNotMatch(source, /(keywords|defaultValue)=\{?[^\n]*(rule|item)\.(value|code)/);
  assert.doesNotMatch(source, /Restore Candidate.*\$\{rule\.value\}/);
  assert.match(source, /: "Content hidden"/);
  assert.match(source, /Candidate text and input codes are not shown here to protect your privacy\./);
});

test("revealed rule values automatically hide again", async () => {
  const source = await readFile(join(process.cwd(), "src", "remove-candidates.tsx"), "utf8");
  assert.match(source, /const REVEAL_DURATION_MS = 60_000/);
  assert.match(source, /setTimeout\(\(\) => setIsRevealed\(false\), REVEAL_DURATION_MS\)/);
});

test("candidate rule list always exposes a visible add entry and per-rule add action", async () => {
  const source = await readFile(join(process.cwd(), "src", "remove-candidates.tsx"), "utf8");
  assert.match(source, /<List\.Section title="Actions">/);
  assert.match(source, /title="Add Blocking Rule"/);
  assert.match(source, /title="Add Demotion Rule"/);
  assert.match(source, /action="block"/);
  assert.match(source, /action="lower"/);
});
