// Copia @passig/shared e @passig/client-core in src/vendor/ e riscrive gli import,
// così l'estensione è autonoma (npm, senza workspace:*) come richiesto dal Raycast Store.
//
// È un passo ESPLICITO e manuale, solo per chi lavora nel monorepo Passig:
// `npm run vendor` ogni volta che cambiano i pacchetti condivisi. NON è agganciato
// a build/dev: nel repository raycast/extensions `src/vendor` è versionato e la
// cartella `packages/` non esiste. Se i sorgenti non ci sono lo script esce
// senza toccare nulla.
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkgs = resolve(root, "../../packages");
const vendor = join(root, "src/vendor");
const HEADER = "// GENERATO da scripts/vendor.mjs — non modificare: modifica packages/ e rilancia `npm run vendor`.\n";

const targets = {
  "@passig/shared": join(vendor, "shared/index.ts"),
  "@passig/client-core": join(vendor, "client-core/index.ts"),
};

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : [];
  });
}

function rel(from, to) {
  let r = relative(dirname(from), to).split(sep).join("/").replace(/\.ts$/, ".js");
  return r.startsWith(".") ? r : "./" + r;
}

function rewrite(file, header) {
  const src = readFileSync(file, "utf8");
  let out = src.replace(/(from\s+|import\s*\(\s*)(["'])(@passig\/(?:shared|client-core))\2/g, (_m, pre, q, name) => `${pre}${q}${rel(file, targets[name])}${q}`);
  if (header && !out.startsWith(HEADER)) out = HEADER + out;
  if (out !== src) writeFileSync(file, out);
}

const sources = [join(pkgs, "shared/src"), join(pkgs, "client-core/src")];
const missing = sources.filter((p) => !existsSync(p));
if (missing.length) {
  console.error(`vendor: sorgenti non trovati (${missing.join(", ")}). Questo script va eseguito solo dal monorepo Passig; src/vendor lasciato invariato.`);
  process.exit(1);
}

// Copia prima in una cartella temporanea e sostituisce src/vendor solo a copia riuscita.
const staging = mkdtempSync(join(tmpdir(), "passig-vendor-"));
cpSync(sources[0], join(staging, "shared"), { recursive: true });
cpSync(sources[1], join(staging, "client-core"), { recursive: true });
rmSync(vendor, { recursive: true, force: true });
try {
  renameSync(staging, vendor);
} catch {
  // rename tra filesystem diversi (EXDEV): copia e poi rimuove la cartella temporanea
  cpSync(staging, vendor, { recursive: true });
  rmSync(staging, { recursive: true, force: true });
}

for (const f of walk(vendor)) rewrite(f, true);
for (const f of walk(join(root, "src"))) if (!f.startsWith(vendor)) rewrite(f, false);
console.log("vendor aggiornato in src/vendor");
