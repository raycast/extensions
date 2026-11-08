import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { after } from "node:test";
import ts from "typescript";

export function loadSources() {
  const output = mkdtempSync(join(tmpdir(), "jw-library-tests-"));
  after(() => rmSync(output, { recursive: true, force: true }));
  for (const file of readdirSync(new URL("../src/", import.meta.url)).filter((file) => file.endsWith(".ts"))) {
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    writeFileSync(join(output, file.replace(/\.ts$/, ".js")), compiled.outputText);
  }
  const require = createRequire(import.meta.url);
  return (name) => require(join(output, `${name}.js`));
}
