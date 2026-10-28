// `node --test test/` — coerenza dei dizionari e comportamento del formatter.
import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkDictionaries, loadDictionaries } from "../scripts/check-i18n.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { format } = await import(pathToFileURL(resolve(root, "src/i18n/format.ts")).href);

test("all dictionaries share the same keys and placeholders as en", async () => {
  const problems = await checkDictionaries();
  assert.deepEqual(problems, []);
});

test("no dictionary value is left in another language by mistake (en has no Italian articles)", async () => {
  const { en } = await loadDictionaries();
  const italian = /\b(il|la|gli|della|inserisci|annulla|salva|elimina)\b/i;
  for (const [k, v] of Object.entries(en)) assert.ok(!italian.test(v), `en "${k}" looks Italian: ${v}`);
});

test("format: named placeholders and numbers", () => {
  assert.equal(format("Code {code} copied (valid for {seconds} s)", { code: "123456", seconds: 17 }, "en"), "Code 123456 copied (valid for 17 s)");
  assert.equal(format("{used} of {max}", { used: 1234, max: 5000 }, "de"), "1.234 of 5.000");
  assert.equal(format("missing {x}", {}, "en"), "missing {x}");
});

test("format: plurals use Intl.PluralRules per language", () => {
  const tpl = "{count, plural, one {# item} other {# items}}";
  assert.equal(format(tpl, { count: 1 }, "en"), "1 item");
  assert.equal(format(tpl, { count: 2 }, "en"), "2 items");
  assert.equal(format("{count, plural, other {#項目}}", { count: 1 }, "ja"), "1項目");
  assert.equal(format("{count, plural, one {{max} vault} other {# vaults of {max}}}", { count: 3, max: 1 }, "en"), "3 vaults of 1");
  assert.equal(format("{n, plural, =0 {none} one {one} other {many}}", { n: 0 }, "en"), "none");
});

test("language detection: BCP-47 / POSIX tags, pt* -> pt-BR, unsupported -> null", async () => {
  const { matchLanguage, resolveLanguage, systemLanguage } = await import(pathToFileURL(resolve(root, "src/i18n/locale.ts")).href);
  assert.equal(matchLanguage("it_IT.UTF-8"), "it");
  assert.equal(matchLanguage("de-CH"), "de");
  assert.equal(matchLanguage("pt"), "pt-BR");
  assert.equal(matchLanguage("pt-PT"), "pt-BR");
  assert.equal(matchLanguage("pt_BR"), "pt-BR");
  assert.equal(matchLanguage("ja_JP"), "ja");
  assert.equal(matchLanguage("nl-NL"), null);
  assert.equal(matchLanguage("C"), null);
  assert.equal(resolveLanguage("fr"), "fr");
  assert.equal(resolveLanguage("xx"), "en");
  assert.equal(systemLanguage({ LANG: "es_ES.UTF-8" }, "linux"), "es");
  assert.equal(systemLanguage({ LC_ALL: "pt_PT.UTF-8", LANG: "it_IT" }, "linux"), "pt-BR");
  assert.equal(systemLanguage({ LANG: "C" }, "linux"), "en");
});
