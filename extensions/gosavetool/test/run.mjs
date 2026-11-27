// Bundles the helpers to CommonJS like `ray build`, then checks text helpers and every image conversion.
import { build } from "esbuild";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "node_modules", ".cache", "gst-test.cjs");
await build({
  stdin: { contents: 'export * as text from "./src/lib/text"; export * as img from "./test/image.test";', resolveDir: root, loader: "ts" },
  bundle: true, platform: "node", format: "cjs", outfile: out, logLevel: "error",
});
const { text, img } = createRequire(import.meta.url)(out);

const s = text.stats("Hello world. This is GoSaveTool!\n\nSecond paragraph.");
assert.equal(s.words, 7);
assert.equal(s.sentences, 3);
assert.equal(s.paragraphs, 2);
assert.equal(text.slug("Ölçü Birimi & Çeviri!"), "olcu-birimi-ceviri");
assert.equal(text.camel("hello big world"), "helloBigWorld");
assert.equal(text.pascal("hello big world"), "HelloBigWorld");
assert.equal(text.constant("helloBigWorld"), "HELLO_BIG_WORLD");
assert.equal(text.title("the lord of the rings"), "The Lord of the Rings");
assert.equal(text.sentence("HELLO. WORLD"), "Hello. World");
assert.equal(text.clean("a   b  \n\n\n\nc"), "a b\n\nc");
assert.equal(text.duration(75), "1 min 15 sec");
// review fixes: trailing sentence, uppercase special letters, acronyms, X weighting
assert.equal(text.stats("Hello world").sentences, 1);
assert.equal(text.stats("Hello world. Next sentence").sentences, 2);
assert.equal(text.stats("...").sentences, 0);
assert.equal(text.slug("Łódź Øresund"), "lodz-oresund");
assert.equal(text.camel("APIKey"), "apiKey");
assert.equal(text.snake("APIKey"), "api_key");
assert.equal(text.snake("parseHTMLString"), "parse_html_string");
assert.equal(text.xLength("hello"), 5);
assert.equal(text.xLength("😀".repeat(141)), 282);
assert.equal(text.xLength("👍🏽"), 2);
assert.equal(text.xLength("日本"), 4);
assert.equal(text.xLength("see https://www.gosavetool.com/character-counter"), 4 + 23);
const x = text.limits("😀".repeat(141)).find((l) => l.key === "x-post");
assert.equal(x.left, -2);
assert.equal(text.xLength(x.fit), 280);
console.log("text ok");

const wasm = join(root, "assets", "wasm");
for (const f of process.argv.slice(2).length ? process.argv.slice(2) : [join(root, "assets", "icon.png")])
  console.log((await img.run(wasm, f)).join("\n"));
console.log("image ok");
