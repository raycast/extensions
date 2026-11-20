// Run: npm test  (Node ≥ 22.18 runs .ts directly; these modules have no Raycast imports)
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePlist } from "../src/plist-fast.ts";
import { pairHubs } from "../src/hubs.ts";

test("parsePlist handles nesting, entities, numbers, data", () => {
  const xml = `<plist><array><dict><key>n</key><string>A &amp; B</string><key>i</key><integer>18100224</integer>
    <key>ok</key><true/><key>kids</key><array><dict><key>d</key><data>AQID</data></dict></array></dict></array></plist>`;
  const [root] = parsePlist(xml) as Record<string, unknown>[];
  assert.equal(root.n, "A & B");
  assert.equal(root.i, 18100224);
  assert.equal(root.ok, true);
  assert.deepEqual([...(root.kids as Record<string, Buffer>[])[0].d], [1, 2, 3]);
});

// Hub halves from a real monitor: USB 2 and USB 3 chains share location paths below the root port.
const hub = (key: string, loc: number, depth: number, ss: boolean, vendorId: number, parentKey?: string) =>
  ({ key, locationId: loc, depth, speedCode: ss ? 4 : 2, vendorId, parentKey, isHub: true, controller: "x" }) as never;

test("pairHubs merges USB 2/3 halves by location path, even with different vendors", () => {
  const devs = [
    hub("ss0", 0x01200000, 0, true, 0x8087),
    hub("hs0", 0x01100000, 0, false, 0x1d5c),
    hub("ss1", 0x01240000, 1, true, 0x0424, "ss0"),
    hub("hs1", 0x01140000, 1, false, 0x0424, "hs0"),
    hub("hs2", 0x01143300, 3, false, 0x0424, "hs1"), // USB 2-only hub: no twin
  ];
  const p = pairHubs(devs);
  assert.equal(p.canon("hs0"), "ss0");
  assert.equal(p.canon("hs1"), "ss1");
  assert.equal(p.canon("hs2"), "hs2");
});

test("pairHubs leaves unrelated root hubs alone", () => {
  const p = pairHubs([hub("a", 0x01100000, 0, false, 0x1111), hub("b", 0x01200000, 0, true, 0x2222)]);
  assert.equal(p.canon("a"), "a");
});
