// Verifica i dizionari di src/i18n: ogni lingua deve avere le stesse chiavi di `en`
// e, per ogni chiave, gli stessi placeholder (`{name}` e argomenti dei plurali).
// Eseguire con `node scripts/check-i18n.mjs` (Node >= 22.18: i .ts vengono caricati
// con type stripping nativo; i dizionari non importano @raycast/api).
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const i18n = (file) => pathToFileURL(resolve(root, "src/i18n", file)).href;

export const LANGUAGES = { en: "en.ts", it: "it.ts", es: "es.ts", de: "de.ts", fr: "fr.ts", "pt-BR": "pt-BR.ts", ja: "ja.ts" };
const EXPORT_NAME = { "pt-BR": "ptBR" };

export async function loadDictionaries() {
  const out = {};
  for (const [lang, file] of Object.entries(LANGUAGES)) {
    const mod = await import(i18n(file));
    out[lang] = mod[EXPORT_NAME[lang] ?? lang];
  }
  return out;
}

/** Ritorna la lista dei problemi (vuota se tutto è coerente). */
export async function checkDictionaries() {
  const { templateArgs, parse } = await import(i18n("format.ts"));
  const dicts = await loadDictionaries();
  const en = dicts.en;
  const problems = [];
  const enKeys = Object.keys(en);
  for (const [lang, dict] of Object.entries(dicts)) {
    if (lang === "en") continue;
    const keys = Object.keys(dict);
    for (const k of enKeys) if (!(k in dict)) problems.push(`${lang}: missing key "${k}"`);
    for (const k of keys) if (!(k in en)) problems.push(`${lang}: extra key "${k}"`);
  }
  for (const [lang, dict] of Object.entries(dicts)) {
    for (const [k, v] of Object.entries(dict)) {
      if (typeof v !== "string" || !v.trim()) problems.push(`${lang}: "${k}" is empty`);
      try {
        parse(v);
      } catch (err) {
        problems.push(`${lang}: "${k}" has invalid syntax (${err.message})`);
      }
    }
  }
  for (const k of enKeys) {
    const expected = templateArgs(en[k]).join(",");
    for (const [lang, dict] of Object.entries(dicts)) {
      if (lang === "en" || !(k in dict)) continue;
      let actual;
      try {
        actual = templateArgs(dict[k]).join(",");
      } catch {
        continue; // già segnalato sopra
      }
      if (actual !== expected) problems.push(`${lang}: "${k}" placeholders [${actual}] differ from en [${expected}]`);
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = await checkDictionaries();
  if (problems.length) {
    console.error(problems.join("\n"));
    console.error(`\n${problems.length} i18n problem(s)`);
    process.exit(1);
  }
  const n = Object.keys((await loadDictionaries()).en).length;
  console.log(`i18n OK: ${n} keys × ${Object.keys(LANGUAGES).length} languages`);
}
