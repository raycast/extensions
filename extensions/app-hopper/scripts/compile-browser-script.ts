import { readFileSync } from "node:fs";
import ts from "typescript";

/** Compile a standalone privileged browser script without introducing module globals. */
export function compileBrowserScript(file: string): string {
  const result = ts.transpileModule(readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: {
      target: ts.ScriptTarget.ES2023,
      module: ts.ModuleKind.ES2022,
      moduleDetection: ts.ModuleDetectionKind.Legacy,
    },
    reportDiagnostics: true,
  });
  const errors = result.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error) ?? [];
  if (errors.length)
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(errors, {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: () => process.cwd(),
        getNewLine: () => "\n",
      }),
    );
  return result.outputText;
}
