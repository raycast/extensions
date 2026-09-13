import { readFile, writeFile } from "node:fs/promises";
import { Jimp, intToRGBA } from "jimp";
import { imageToAscii, imageToDots } from "../src/image-art.ts";

const columns = 24;
const input = await readFile(new URL("../docs/emoji-example.png", import.meta.url));
const glyphs = JSON.parse(await readFile(new URL("../docs/glyph-samples.json", import.meta.url), "utf8"));
const maxima = Array.from({ length: 6 }, (_, i) => Math.max(...glyphs.map((glyph) => glyph.shape[i])));
for (const glyph of glyphs) glyph.shape = glyph.shape.map((value, i) => value / maxima[i]);
const image = await Jimp.fromBuffer(input);
const rows = Math.round((columns * image.height) / image.width / 2);
image.resize({ w: columns * 2, h: rows * 3 });
const shape = Array.from({ length: rows }, (_, row) =>
  Array.from({ length: columns }, (_, col) => {
    const vector = Array.from({ length: 6 }, (_, i) => {
      const { r, g, b, a } = intToRGBA(image.getPixelColor(col * 2 + (i % 2), row * 3 + Math.floor(i / 2)));
      return (1 - (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255) * (a / 255);
    });
    let best = " ";
    let distance = Infinity;
    for (const glyph of glyphs) {
      const score = vector.reduce((sum, value, i) => sum + (value - glyph.shape[i]) ** 2, 0);
      if (score < distance) {
        best = glyph.character;
        distance = score;
      }
    }
    return best;
  })
    .join("")
    .trimEnd(),
).join("\n");
const results = [
  ["Current brightness ASCII", await imageToAscii(input, columns)],
  ["Experimental glyph-shape matching", shape],
  ["Unicode Dots with Floyd-Steinberg dithering", await imageToDots(input, columns)],
];
let report =
  "# Image rendering comparison\n\nSame Twemoji source, 24 columns and 12 rows per result. Shape matching is a research prototype, not a shipped style. Unicode Dots is the implemented higher-detail option.\n\n";
for (const [title, output] of results) report += `## ${title}\n\n\`\`\`text\n${output}\n\`\`\`\n\n`;
report +=
  "The simple six-region glyph prototype is not a demonstrated improvement over the baseline for this small emoji. It needs a richer font model and contrast tuning before integration. Unicode Dots preserves more subcell detail at the same character count.\n\nSources: [shape matching](https://alexharri.com/blog/ascii-rendering), [Braille conversion and dithering](https://github.com/TheZoraiz/ascii-image-converter), [Unicode Braille patterns](https://www.unicode.org/charts/nameslist/n_2800.html).\n";
await writeFile(new URL("../docs/rendering-comparison.md", import.meta.url), report);
for (const [title, output] of results) console.log(`${title}\n${output}\n`);
