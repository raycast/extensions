import { Jimp } from "jimp";
import { expect, it } from "vitest";
import { imageToDots } from "../src/image-art";

const WHITE = 0xffffffff;
const BLACK = 0x000000ff;
const EXPECTED_BITS = [
  [1, 8],
  [2, 16],
  [4, 32],
  [64, 128],
];
for (let y = 0; y < 4; y++) {
  for (let x = 0; x < 2; x++) {
    it(`maps the dot at ${x},${y} to its Unicode Braille bit`, async () => {
      const image = new Jimp({ width: 2, height: 4, color: WHITE });
      image.setPixelColor(BLACK, x, y);
      expect(await imageToDots(await image.getBuffer("image/png"), 1)).toBe(
        String.fromCodePoint(0x2800 + EXPECTED_BITS[y][x]),
      );
    });
  }
}
it("preserves full and empty dot cells, including transparency", async () => {
  const black = new Jimp({ width: 2, height: 4, color: BLACK });
  const clear = new Jimp({ width: 2, height: 4, color: 0x00000000 });
  expect(await imageToDots(await black.getBuffer("image/png"), 1)).toBe("⣿");
  expect(await imageToDots(await clear.getBuffer("image/png"), 1)).toBe("⠀");
  expect(await imageToDots(await black.getBuffer("image/png"), 1, true)).toBe("⠀");
});
it("dithers gray regions instead of dropping them or filling them solid", async () => {
  const gray = new Jimp({ width: 16, height: 16, color: 0x808080ff });
  const output = await imageToDots(await gray.getBuffer("image/png"), 8);
  expect(output).toMatch(/^[\u2800-\u28ff\n]+$/);
  expect(output).not.toMatch(/^[⠀\n]+$/);
  expect(output).not.toMatch(/^[⣿\n]+$/);
  expect(output.split("\n")).toHaveLength(4);
});
