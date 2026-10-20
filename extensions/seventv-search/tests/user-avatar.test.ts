import assert from "node:assert/strict";
import { test } from "node:test";
import { avatarBounds, avatarDataURL } from "../src/user-avatar.ts";

test("avatars retain equal ten-percent margins after each interface scale", () => {
  for (const [size, scale] of [
    ["default", 1],
    ["large", 1.1],
    ["larger", 1.2],
  ] as const) {
    const { offset, side } = avatarBounds(size);
    assert.ok(Math.abs(offset * scale - 10) < 0.0001);
    assert.ok(Math.abs((offset + side) * scale - 90) < 0.0001);
  }
});
test("avatar canvas embeds the complete source and contains its aspect ratio", () => {
  const original = Uint8Array.from([137, 80, 78, 71, 10, 20, 30]);
  const url = avatarDataURL(original, "image/png", "larger");
  const svg = Buffer.from(url.split(",")[1], "base64").toString();
  const embedded = svg.match(/data:image\/png;base64,([^\"]+)/)![1];
  assert.deepEqual(Buffer.from(embedded, "base64"), Buffer.from(original));
  assert.match(svg, /preserveAspectRatio="xMidYMid meet"/);
  assert.throws(() => avatarDataURL(original, "text/html"));
});
