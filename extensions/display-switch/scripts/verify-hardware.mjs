import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const id = process.argv[2];
if (!id) throw new Error("Usage: node scripts/verify-hardware.mjs DISPLAY_UUID (briefly disables this display)");
const helper = `assets/display-control-${process.arch === "arm64" ? "arm64" : "x86_64"}`;
const run = (...args) => JSON.parse(execFileSync(helper, args, { encoding: "utf8", timeout: 15000 }));
const before = run("list");
const target = before.find((display) => display.id === id);
assert.ok(target?.enabled, "Choose an enabled display");
assert.ok(before.filter((display) => display.enabled).length > 1, "At least two displays required");
try {
  const off = run("set", id, "off");
  assert.equal(off.find((display) => display.id === id)?.enabled, false);
  // A separate process must still find the disabled display.
  assert.equal(run("list").find((display) => display.id === id)?.enabled, false);
} finally {
  const on = run("set", id, "on");
  const restored = on.find((display) => display.id === id);
  assert.ok(restored?.enabled);
  assert.equal(restored.width, target.width);
  assert.equal(restored.height, target.height);
  assert.ok(on.every((display) => before.find((item) => item.id === display.id)?.enabled === display.enabled));
}
console.log(`${target.name}: disabled, retained across process restart, re-enabled, resolution verified.`);
