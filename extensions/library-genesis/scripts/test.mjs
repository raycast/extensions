import { spawnSync } from "node:child_process";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const directory = await mkdtemp(join(tmpdir(), "library-genesis-tests-"));
try {
  const testFiles = [
    "tests/api.test.ts",
    "tests/downloads.test.ts",
    "tests/ui-updates.test.ts",
    "tests/cover-security.test.ts",
    "tests/cover-size.test.ts",
    "tests/cover-cache.test.ts",
    "tests/folder-picker.test.ts",
  ];
  const config = ts.readConfigFile(join(projectRoot, "tsconfig.json"), ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  const { options, errors } = ts.parseJsonConfigFileContent(config.config, ts.sys, projectRoot);
  if (errors.length)
    throw new Error(errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n")).join("\n"));
  const program = ts.createProgram(
    testFiles.map((file) => join(projectRoot, file)),
    {
      ...options,
      rootDir: projectRoot,
      outDir: directory,
      noEmit: false,
      sourceMap: false,
    },
  );
  // TypeScript preserves path aliases in emitted imports; make them relative for Node.
  const result = program.emit(undefined, undefined, undefined, false, {
    before: [
      (context) => (source) => {
        const visit = (node) => {
          if (
            (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
            node.moduleSpecifier &&
            ts.isStringLiteral(node.moduleSpecifier) &&
            node.moduleSpecifier.text.startsWith("@/")
          ) {
            const path = relative(
              dirname(source.fileName),
              join(projectRoot, "src", node.moduleSpecifier.text.slice(2)),
            )
              .split(sep)
              .join("/");
            const specifier = ts.factory.createStringLiteral(path.startsWith(".") ? path : `./${path}`);
            return ts.isImportDeclaration(node)
              ? ts.factory.updateImportDeclaration(node, node.modifiers, node.importClause, specifier, node.attributes)
              : ts.factory.updateExportDeclaration(
                  node,
                  node.modifiers,
                  node.isTypeOnly,
                  node.exportClause,
                  specifier,
                  node.attributes,
                );
          }
          return ts.visitEachChild(node, visit, context);
        };
        return ts.visitNode(source, visit);
      },
    ],
  });
  if (result.emitSkipped || result.diagnostics.length) {
    throw new Error(
      result.diagnostics.map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n")).join("\n") ||
        "Test compilation failed.",
    );
  }
  // Resolve runtime dependencies without copying or bundling them into the test output.
  await symlink(join(projectRoot, "node_modules"), join(directory, "node_modules"), "junction");
  const outputs = testFiles.map((file) => join(directory, file.replace(/\.ts$/, ".js")));
  const tests = spawnSync(process.execPath, ["--test", ...outputs], { stdio: "inherit" });
  if (tests.error) throw tests.error;
  process.exitCode = tests.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
