// Copia @passig/shared e @passig/client-core in src/vendor/ e riscrive gli import,
// così l'estensione è autonoma (npm, senza workspace:*) come richiesto dal Raycast Store.
// Eseguire con `npm run vendor` (o `pnpm vendor`) ogni volta che cambiano i pacchetti condivisi.
import { cpSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
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

rmSync(vendor, { recursive: true, force: true });
cpSync(join(pkgs, "shared/src"), join(vendor, "shared"), { recursive: true });
cpSync(join(pkgs, "client-core/src"), join(vendor, "client-core"), { recursive: true });

for (const f of walk(vendor)) rewrite(f, true);
for (const f of walk(join(root, "src"))) if (!f.startsWith(vendor)) rewrite(f, false);
console.log("vendor aggiornato in src/vendor");
