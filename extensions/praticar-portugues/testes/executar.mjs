/**
 * Empacota a bateria com o mesmo esbuild que o Raycast usa e roda o resultado.
 * Node puro não resolve os imports sem extensão do código-fonte; passar pelo
 * bundler garante que o teste exercita exatamente o que vai para a extensão.
 */
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = fileURLToPath(new URL(".", import.meta.url));
const alvo = process.argv[2] ?? "nucleo.test.ts";
const pasta = mkdtempSync(join(tmpdir(), "praticar-portugues-"));
const saida = join(pasta, "bateria.mjs");

try {
  await build({
    entryPoints: [join(aqui, alvo)],
    outfile: saida,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    logLevel: "warning",
  });

  const resultado = spawnSync(process.execPath, [saida], { stdio: "inherit" });
  process.exit(resultado.status ?? 1);
} finally {
  rmSync(pasta, { recursive: true, force: true });
}
