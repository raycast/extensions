/**
 * Drift guard for the mirrored tokenizer (app ↔ extension).
 *
 * The two tokenize.ts copies must stay byte-identical; this test fails when
 * one is edited without the other. It also runs a fixture corpus through both
 * and asserts identical token output.
 *
 * Run: node test/tokenizer-parity.mjs
 */

import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_FILE = path.join(__dirname, "../src/lib/tokenize.ts");
const APP_FILE = path.join(
  os.homedir(),
  "Library/Application Support/app.glaze.macos.main/apps/shelf-local-1v0xag7h/.glaze-sources/main/saturn/tokenize.ts",
);

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

const extSrc = readFileSync(EXT_FILE, "utf8");
let appSrc;
try {
  appSrc = readFileSync(APP_FILE, "utf8");
} catch {
  fail(`app tokenize.ts not found at ${APP_FILE}`);
}
if (extSrc !== appSrc) {
  fail("tokenize.ts copies differ between the Saturn app and this extension");
}

async function loadModule(src) {
  const js = transformSync(src, { loader: "ts", format: "esm" }).code;
  return import(`data:text/javascript,${encodeURIComponent(js)}`);
}

const [ext, app] = await Promise.all([loadModule(extSrc), loadModule(appSrc)]);

const fixtures = [
  "Hello, World!",
  "Café naïve résumé — Über alles",
  "日本語のテキストと English mix",
  "emoji 🚀 test 123",
  "MixedCASE ABCdef ghI",
  "punct...uation!! marks?? yes;no:maybe",
  "  spaced\tout\nnewlines\r\nhere  ",
  "don’t stop–believin’ —dash—",
  "a b c",
  "Year 2026-07-25T21:43:44Z",
  `looooong ${"word ".repeat(20000)}`,
];

let checked = 0;
for (const f of fixtures) {
  const eT = ext.tokenize(f);
  const aT = app.tokenize(f);
  if (JSON.stringify(eT) !== JSON.stringify(aT)) {
    fail(`tokenize mismatch for ${JSON.stringify(f.slice(0, 48))}`);
  }
  const eB = ext.tokenizeBody(f);
  const aB = app.tokenizeBody(f);
  if (JSON.stringify(eB) !== JSON.stringify(aB)) {
    fail(`tokenizeBody mismatch for ${JSON.stringify(f.slice(0, 48))}`);
  }
  checked++;
}

if (ext.BODY_TOKEN_CAP !== app.BODY_TOKEN_CAP) fail("BODY_TOKEN_CAP differs");
if (ext.tokenizeBody("word ".repeat(30000)).length !== ext.BODY_TOKEN_CAP) {
  fail("tokenizeBody cap not enforced");
}
if (ext.tokenize("Straße").join() !== "straße") fail("unicode lowercasing broken");

console.log(
  `PASS tokenizer parity — ${checked} fixtures identical across app/extension (cap ${ext.BODY_TOKEN_CAP})`,
);
