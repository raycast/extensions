import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderPost } from "../src/render.ts";

const script = fileURLToPath(new URL("../assets/render.js", import.meta.url));

const cases = [
  { name: "post", id: "2113453507793592715", theme: "dark", minHeight: 300 },
  { name: "post", id: "2113453507793592715", theme: "light", minHeight: 300 },
  { name: "thread", id: "2113562022839505343", theme: "dark", minHeight: 400 },
  { name: "quote", id: "2113877257613947348", theme: "dim", minHeight: 500 },
];

for (const { name, id, theme, minHeight } of cases) {
  const html = await readFile(new URL(`../fixtures/${name}.html`, import.meta.url), "utf8");
  const png = await renderPost(html, theme, id, script);
  assert.equal(png.subarray(1, 4).toString(), "PNG", "not a PNG");
  const [width, height] = [png.readUInt32BE(16), png.readUInt32BE(20)];
  assert.equal(width, 656 * 2, `${name}: unexpected width ${width}`);
  assert.ok(height > minHeight, `${name}: card too short: ${height}`);
  const out = join(tmpdir(), `hw_raycast_xscreenshot-check-${name}-${theme}.png`);
  await writeFile(out, png);
  console.log(`OK - ${name}/${theme}: ${width}x${height} ${out}`);
}
