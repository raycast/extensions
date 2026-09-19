import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  type Dirent,
  type Stats,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

type ProductionSourceFile = Readonly<{
  absolutePath: string;
  relativePath: string;
}>;

type ParsedSource = Readonly<{
  references: readonly string[];
}>;

type AuditSourceInput = ProductionSourceFile &
  Readonly<{
    sourceText: string;
  }>;

type AuditProgram = Readonly<{
  checker: ts.TypeChecker;
  sourceFiles: ReadonlyMap<string, ts.SourceFile>;
}>;

type ModuleSelection = Readonly<{
  exposesObject: boolean;
  names: readonly string[];
}>;

type AuditContext = Readonly<{
  checker: ts.TypeChecker;
  relativePath: string;
  sourceFile: ts.SourceFile;
}>;

type ShortcutContext = AuditContext &
  Readonly<{
    constants: ReadonlyMap<ts.Symbol, ts.Expression>;
    shortcutBuilders: ReadonlyMap<ts.Symbol, number>;
    verifiedHelpers: ReadonlyMap<ts.Symbol, 1 | 2>;
  }>;

const SOURCE_ROOT = resolve(__dirname, "../..");
const NO_TOUCH_CONTRACT_DIRECTORY = "infrastructure/mcp/contract";
const PROTECTED_LAYER_PATTERN = /^src\/(?:commands|components|hooks|tools)\//;
const CONCRETE_BACKEND_NAMES = new Set(["McpTickTickBackend", "OpenApiTickTickBackend", "MacOsAppleScriptBackend"]);
const ANALYTICS_SDK_PATTERN =
  /(?:^|[/@._-])(?:analytics|telemetry|sentry|posthog|segment|amplitude|mixpanel|datadog|newrelic|opentelemetry)(?:$|[/@._-])/i;
const EXECUTABLE_HELPER_PATTERN =
  /^(?:@[^/]+\/)?(?:download-cli|download-file|node-downloader-helper|installer|pkg-install|execa|cross-spawn|shelljs)(?:\/|$)/i;
const EXECUTABLE_CAPABILITIES = new Set([
  "downloadFile",
  "downloadAndInstall",
  "downloadExecutable",
  "installBinary",
  "installExecutable",
]);
const CHILD_PROCESS_PATTERN = /^(?:node:)?child_process(?:\/|$)/;
const LEGACY_SHIM_RELATIVE_PATH = "src/service/osScript.ts";
const LEGACY_SHIM_REMOVAL_MESSAGE =
  "src/service/osScript.ts: compatibility-shim boundary requires removal because no production consumer remains.";
const SHORTCUT_PRODUCERS = Object.freeze([
  "src/keyboardShortcuts.ts",
  "src/components/taskActions.ts",
  "src/components/ConnectionActions.tsx",
  "src/components/TaskListView.tsx",
]);

function enumerateProductionSources(sourceRoot: string): readonly ProductionSourceFile[] {
  const logicalRoot = resolve(sourceRoot);
  const rootStat = safeLstat(logicalRoot, "src");
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw violation("src", "symbolic-link");
  const realRoot = safeRealPath(logicalRoot, "src");
  requireWithinSourceRoot(realRoot, realRoot, "src");

  const files: ProductionSourceFile[] = [];
  const walk = (directory: string): void => {
    let entries: Dirent<string>[];
    try {
      entries = readdirSync(directory, { withFileTypes: true, encoding: "utf8" });
    } catch {
      throw violation(displayPath(logicalRoot, directory), "filesystem-enumeration");
    }
    for (const entry of [...entries].sort((left, right) => compareText(left.name, right.name))) {
      const candidate = resolve(directory, entry.name);
      const relativeFromRoot = normalizedRelative(logicalRoot, candidate);
      const sourcePath = relativeFromRoot.length === 0 ? "src" : "src/" + relativeFromRoot;
      const stat = safeLstat(candidate, sourcePath);
      if (stat.isSymbolicLink()) throw violation(sourcePath, "symbolic-link");
      if (stat.isDirectory() && isExcludedDirectory(relativeFromRoot)) continue;
      const realCandidate = safeRealPath(candidate, sourcePath);
      requireWithinSourceRoot(realRoot, realCandidate, sourcePath);
      if (stat.isDirectory()) walk(candidate);
      else if (stat.isFile() && isProductionTypeScript(relativeFromRoot)) {
        files.push(Object.freeze({ absolutePath: candidate, relativePath: sourcePath }));
      }
    }
  };

  walk(logicalRoot);
  return Object.freeze(files.sort((left, right) => compareText(left.relativePath, right.relativePath)));
}

function safeLstat(path: string, relativePath: string): Stats {
  try {
    return lstatSync(path);
  } catch {
    throw violation(relativePath, "filesystem-enumeration");
  }
}

function safeRealPath(path: string, relativePath: string): string {
  try {
    return realpathSync.native(path);
  } catch {
    throw violation(relativePath, "filesystem-realpath");
  }
}

function requireWithinSourceRoot(realRoot: string, realCandidate: string, relativePath: string): void {
  const candidateRelative = relative(realRoot, realCandidate);
  if (
    candidateRelative !== "" &&
    (isAbsolute(candidateRelative) || candidateRelative === ".." || candidateRelative.startsWith(".." + sep))
  ) {
    throw violation(relativePath, "source-root-escape");
  }
}

function displayPath(logicalRoot: string, candidate: string): string {
  const relativePath = normalizedRelative(logicalRoot, candidate);
  return relativePath.length === 0 ? "src" : "src/" + relativePath;
}

function normalizedRelative(root: string, candidate: string): string {
  return relative(root, candidate).split(sep).join("/");
}

function isExcludedDirectory(relativePath: string): boolean {
  if (relativePath === NO_TOUCH_CONTRACT_DIRECTORY || relativePath === "test") return true;
  return relativePath.split("/").some((segment) => segment === "__tests__" || segment === "__generated__");
}

function isProductionTypeScript(relativePath: string): boolean {
  if (!/\.tsx?$/i.test(relativePath)) return false;
  if (/\.d\.tsx?$/i.test(relativePath) || /\.(?:test|spec)\.tsx?$/i.test(relativePath)) return false;
  if (/\.(?:generated|gen)\.tsx?$/i.test(relativePath)) return false;
  return !relativePath.split("/").some((segment) => segment === "generated" || segment === "fixtures");
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function auditProductionTree(sourceRoot: string): readonly string[] {
  const files = enumerateProductionSources(sourceRoot);
  const inputs = files.map((file) => Object.freeze({ ...file, sourceText: safeReadSource(file) }));
  const program = createAuditProgram(inputs);
  const parsed = new Map<string, ParsedSource>();
  for (const file of files) {
    const sourceFile = program.sourceFiles.get(file.relativePath);
    if (sourceFile === undefined) throw violation(file.relativePath, "typescript-parse");
    parsed.set(file.relativePath, auditSourceFile(file.relativePath, sourceFile, program.checker));
  }
  assertLegacyShimLifecycle(sourceRoot, files, parsed);
  return Object.freeze(files.map(({ relativePath }) => relativePath));
}

function safeReadSource(file: ProductionSourceFile): string {
  try {
    return readFileSync(file.absolutePath, "utf8");
  } catch {
    throw violation(file.relativePath, "source-read");
  }
}

function auditSourceText(relativePath: string, sourceText: string): ParsedSource {
  const input = virtualAuditInput(relativePath, sourceText);
  const program = createAuditProgram([input]);
  const sourceFile = program.sourceFiles.get(relativePath);
  if (sourceFile === undefined) throw violation(relativePath, "typescript-parse");
  return auditSourceFile(relativePath, sourceFile, program.checker);
}

function parseTypeScriptSource(relativePath: string, sourceText: string): ts.SourceFile {
  const input = virtualAuditInput(relativePath, sourceText);
  const program = createAuditProgram([input]);
  const sourceFile = program.sourceFiles.get(relativePath);
  if (sourceFile === undefined) throw violation(relativePath, "typescript-parse");
  return sourceFile;
}

function virtualAuditInput(relativePath: string, sourceText: string): AuditSourceInput {
  return Object.freeze({
    absolutePath: resolve(tmpdir(), "ticktick-regression-virtual", ...relativePath.split("/")),
    relativePath,
    sourceText,
  });
}

function createAuditProgram(inputs: readonly AuditSourceInput[]): AuditProgram {
  const options: ts.CompilerOptions = {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    types: [],
  };
  const canonical = (path: string): string => {
    const absolute = resolve(path).replaceAll("\\", "/");
    return process.platform === "win32" ? absolute.toLowerCase() : absolute;
  };
  const byPath = new Map(inputs.map((input) => [canonical(input.absolutePath), input]));
  const baseHost = ts.createCompilerHost(options, true);
  const candidatesFor = (moduleName: string, containingFile: string): readonly string[] => {
    const base = resolve(dirname(containingFile), moduleName);
    const withoutJavaScript = base.replace(/\.(?:c|m)?jsx?$/i, "");
    return Object.freeze([
      base,
      base + ".ts",
      base + ".tsx",
      withoutJavaScript + ".ts",
      withoutJavaScript + ".tsx",
      join(base, "index.ts"),
      join(base, "index.tsx"),
    ]);
  };
  const host: ts.CompilerHost = {
    ...baseHost,
    directoryExists: (path) => {
      const prefix = canonical(path).replace(/\/$/, "") + "/";
      return (
        [...byPath.keys()].some((candidate) => candidate.startsWith(prefix)) ||
        (baseHost.directoryExists?.(path) ?? false)
      );
    },
    fileExists: (path) => byPath.has(canonical(path)) || baseHost.fileExists(path),
    getDirectories: (path) => baseHost.getDirectories?.(path) ?? [],
    getSourceFile: (path) => {
      const input = byPath.get(canonical(path));
      if (input === undefined) return baseHost.getSourceFile(path, ts.ScriptTarget.ES2022);
      const kind = /\.tsx$/i.test(path) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
      return ts.createSourceFile(input.absolutePath, input.sourceText, ts.ScriptTarget.ES2022, true, kind);
    },
    readFile: (path) => byPath.get(canonical(path))?.sourceText ?? baseHost.readFile(path),
    resolveModuleNames: (moduleNames, containingFile) =>
      moduleNames.map((moduleName) => {
        if (!moduleName.startsWith(".")) return undefined;
        const match = candidatesFor(moduleName, containingFile).find((candidate) => byPath.has(canonical(candidate)));
        return match === undefined
          ? undefined
          : { isExternalLibraryImport: false, resolvedFileName: byPath.get(canonical(match))!.absolutePath };
      }),
  };

  let program: ts.Program;
  try {
    program = ts.createProgram({ host, options, rootNames: inputs.map(({ absolutePath }) => absolutePath) });
  } catch {
    throw violation(inputs[0]?.relativePath ?? "src", "typescript-parse");
  }
  const sourceFiles = new Map<string, ts.SourceFile>();
  for (const input of inputs) {
    const sourceFile = program.getSourceFile(input.absolutePath);
    if (
      sourceFile === undefined ||
      program.getSyntacticDiagnostics(sourceFile).some(({ category }) => category === ts.DiagnosticCategory.Error)
    ) {
      throw violation(input.relativePath, "typescript-parse");
    }
    sourceFiles.set(input.relativePath, sourceFile);
  }
  return Object.freeze({ checker: program.getTypeChecker(), sourceFiles });
}

function auditSourceFile(relativePath: string, sourceFile: ts.SourceFile, checker: ts.TypeChecker): ParsedSource {
  const context = Object.freeze({ checker, relativePath, sourceFile });
  const references = auditModuleSyntax(context);
  auditShortcuts(context);
  return Object.freeze({ references });
}

function auditModuleSyntax(context: AuditContext): readonly string[] {
  const references: string[] = [];
  const createRequireSymbols = collectCreateRequireSymbols(context);
  const addUse = (node: ts.Node, specifier: string, selection: ModuleSelection): void => {
    references.push(specifier);
    auditNodeModuleAcquisition(context.relativePath, node, specifier);
    auditModuleUse(context, specifier, selection);
    auditProtectedBackendUse(context, node, specifier, selection);
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const specifier = requireStaticSpecifier(context.relativePath, node.moduleSpecifier);
      addUse(node, specifier, importSelection(node));
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      const specifier = requireStaticSpecifier(context.relativePath, node.moduleSpecifier);
      addUse(node, specifier, exportSelection(node));
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      const specifier = requireStaticSpecifier(context.relativePath, node.moduleReference.expression);
      addUse(node, specifier, Object.freeze({ exposesObject: true, names: Object.freeze([]) }));
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      const specifier = requireStaticSpecifier(context.relativePath, node.argument.literal);
      addUse(node, specifier, importTypeSelection(node));
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const specifier = requireStaticSpecifier(context.relativePath, node.arguments[0]);
      addUse(node, specifier, loaderSelection(node));
    } else if (ts.isCallExpression(node) && isDirectGlobalRequireCall(node, context.checker)) {
      const specifier = requireStaticSpecifier(context.relativePath, node.arguments[0]);
      addUse(node, specifier, loaderSelection(node));
    } else if (ts.isCallExpression(node) && isImmediateCreateRequireLoad(node, createRequireSymbols, context.checker)) {
      const specifier = requireStaticSpecifier(context.relativePath, node.arguments[0]);
      addUse(node, specifier, loaderSelection(node));
    }

    if (ts.isIdentifier(node) && isGlobalRequireIdentifier(node, context.checker)) {
      if (!(ts.isCallExpression(node.parent) && node.parent.expression === node)) {
        throw violation(context.relativePath, "nonliteral-module-load");
      }
    }
    if (ts.isIdentifier(node) && symbolInSet(node, createRequireSymbols, context.checker)) {
      if (!isImportBindingName(node) && !isSafeCreateRequireIdentifierUse(node)) {
        throw violation(context.relativePath, "nonliteral-module-load");
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(context.sourceFile);
  return Object.freeze(references);
}

function collectCreateRequireSymbols(context: AuditContext): ReadonlySet<ts.Symbol> {
  const symbols = new Set<ts.Symbol>();
  for (const statement of context.sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !isExactCreateRequireImport(statement)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      if ((element.propertyName ?? element.name).text !== "createRequire") continue;
      const symbol = context.checker.getSymbolAtLocation(element.name);
      if (symbol !== undefined) symbols.add(symbol);
    }
  }
  return symbols;
}

function isExactCreateRequireImport(node: ts.ImportDeclaration): boolean {
  if (stringLiteralText(node.moduleSpecifier) !== "node:module") return false;
  const clause = node.importClause;
  return Boolean(
    clause &&
      !clause.isTypeOnly &&
      clause.name === undefined &&
      clause.namedBindings &&
      ts.isNamedImports(clause.namedBindings) &&
      clause.namedBindings.elements.length === 1 &&
      !clause.namedBindings.elements[0].isTypeOnly &&
      clause.namedBindings.elements[0].propertyName === undefined &&
      clause.namedBindings.elements[0].name.text === "createRequire"
  );
}

function auditNodeModuleAcquisition(relativePath: string, node: ts.Node, specifier: string): void {
  if (specifier === "node:module" && ts.isImportDeclaration(node) && isExactCreateRequireImport(node)) return;
  if (isNodeModuleSpecifier(specifier)) throw violation(relativePath, "nonliteral-module-load");
}

function importSelection(node: ts.ImportDeclaration): ModuleSelection {
  const clause = node.importClause;
  if (clause === undefined) return Object.freeze({ exposesObject: true, names: Object.freeze([]) });
  let exposesObject = clause.name !== undefined;
  const names: string[] = [];
  const bindings = clause.namedBindings;
  if (bindings && ts.isNamespaceImport(bindings)) exposesObject = true;
  if (bindings && ts.isNamedImports(bindings)) {
    for (const element of bindings.elements) {
      const imported = (element.propertyName ?? element.name).text;
      if (imported === "default") exposesObject = true;
      else names.push(imported);
    }
  }
  return Object.freeze({ exposesObject, names: Object.freeze(names) });
}

function exportSelection(node: ts.ExportDeclaration): ModuleSelection {
  const clause = node.exportClause;
  if (clause === undefined || ts.isNamespaceExport(clause)) {
    return Object.freeze({ exposesObject: true, names: Object.freeze([]) });
  }
  let exposesObject = false;
  const names: string[] = [];
  for (const element of clause.elements) {
    const exported = (element.propertyName ?? element.name).text;
    if (exported === "default") exposesObject = true;
    else names.push(exported);
  }
  return Object.freeze({ exposesObject, names: Object.freeze(names) });
}

function importTypeSelection(node: ts.ImportTypeNode): ModuleSelection {
  const names = node.qualifier === undefined ? [] : entityNameParts(node.qualifier);
  if (names.length === 0 && ts.isIndexedAccessTypeNode(node.parent) && node.parent.objectType === node) {
    const selected = literalTypeText(node.parent.indexType);
    if (selected !== undefined) names.push(selected);
  }
  return Object.freeze({ exposesObject: false, names: Object.freeze(names) });
}

function loaderSelection(call: ts.CallExpression): ModuleSelection {
  let candidate: ts.Node = call;
  while (
    candidate.parent &&
    (ts.isAwaitExpression(candidate.parent) ||
      ts.isParenthesizedExpression(candidate.parent) ||
      ts.isAsExpression(candidate.parent) ||
      ts.isTypeAssertionExpression(candidate.parent) ||
      ts.isSatisfiesExpression(candidate.parent) ||
      ts.isNonNullExpression(candidate.parent))
  ) {
    candidate = candidate.parent;
  }
  const parent = candidate.parent;
  if (parent && ts.isPropertyAccessExpression(parent) && parent.expression === candidate) {
    return Object.freeze({ exposesObject: parent.name.text === "default", names: Object.freeze([parent.name.text]) });
  }
  if (parent && ts.isElementAccessExpression(parent) && parent.expression === candidate) {
    const name = stringLiteralText(parent.argumentExpression);
    return name === undefined
      ? Object.freeze({ exposesObject: true, names: Object.freeze([]) })
      : Object.freeze({ exposesObject: name === "default", names: Object.freeze([name]) });
  }
  if (parent && ts.isVariableDeclaration(parent) && parent.initializer === candidate) {
    if (!ts.isObjectBindingPattern(parent.name)) {
      return Object.freeze({ exposesObject: true, names: Object.freeze([]) });
    }
    const names: string[] = [];
    for (const element of parent.name.elements) {
      if (element.dotDotDotToken || !ts.isIdentifier(element.name)) {
        return Object.freeze({ exposesObject: true, names: Object.freeze([]) });
      }
      const name = element.propertyName ? propertyName(element.propertyName) : element.name.text;
      if (name === undefined) return Object.freeze({ exposesObject: true, names: Object.freeze([]) });
      names.push(name);
    }
    return Object.freeze({ exposesObject: names.includes("default"), names: Object.freeze(names) });
  }
  return Object.freeze({ exposesObject: true, names: Object.freeze([]) });
}

function auditModuleUse(context: AuditContext, rawSpecifier: string, selection: ModuleSelection): void {
  const specifier = rawSpecifier.replaceAll("\\", "/");
  if (isPackage(specifier, "run-applescript") && !context.relativePath.startsWith("src/infrastructure/macos/")) {
    throw violation(context.relativePath, "run-applescript-location");
  }
  if (CHILD_PROCESS_PATTERN.test(specifier)) throw violation(context.relativePath, "subprocess-capability");
  if (isExternalModule(specifier) && ANALYTICS_SDK_PATTERN.test(specifier)) {
    throw violation(context.relativePath, "analytics-telemetry-capability");
  }
  if (isExternalModule(specifier) && EXECUTABLE_HELPER_PATTERN.test(specifier)) {
    throw violation(context.relativePath, "executable-download-install-capability");
  }
  if (isPackage(specifier, "@raycast/api")) {
    if (selection.exposesObject || selection.names.includes("Keychain")) {
      throw violation(context.relativePath, "raycast-keychain-capability");
    }
  }
  if (isPackage(specifier, "@raycast/utils")) {
    if (selection.exposesObject || selection.names.some((name) => EXECUTABLE_CAPABILITIES.has(name))) {
      throw violation(context.relativePath, "executable-download-install-capability");
    }
  }
}

function auditProtectedBackendUse(
  context: AuditContext,
  node: ts.Node,
  specifier: string,
  selection: ModuleSelection
): void {
  if (!PROTECTED_LAYER_PATTERN.test(context.relativePath)) return;
  const backendSpecifier = isBackendModuleSpecifier(specifier);
  const canonicalPort = /(?:^|\/)infrastructure\/backend\/TickTickBackend(?:\.[cm]?[jt]sx?)?$/i.test(
    specifier.replaceAll("\\", "/")
  );
  if (selection.names.some((name) => CONCRETE_BACKEND_NAMES.has(name))) {
    throw violation(context.relativePath, "concrete-backend-import");
  }
  if (backendSpecifier && selection.exposesObject) {
    throw violation(context.relativePath, "concrete-backend-import");
  }
  if (backendSpecifier && !canonicalPort && selection.names.length > 0) {
    throw violation(context.relativePath, "concrete-backend-import");
  }

  const symbols = importedSymbols(node, context.checker);
  for (const { importedName, symbol } of symbols) {
    const concrete = symbolHasConcreteBackendOrigin(symbol, context.checker, new Set());
    if (
      concrete ||
      (importedName === "BackendFactory" &&
        (backendSpecifier || !symbolHasResolvedDeclaration(symbol, context.checker)))
    ) {
      throw violation(context.relativePath, "concrete-backend-import");
    }
  }
  if (
    selection.names.includes("BackendFactory") &&
    (backendSpecifier ||
      symbols.length === 0 ||
      symbols.some(({ symbol }) => !symbolHasResolvedDeclaration(symbol, context.checker)))
  ) {
    throw violation(context.relativePath, "concrete-backend-import");
  }
}

function importedSymbols(
  node: ts.Node,
  checker: ts.TypeChecker
): readonly Readonly<{ importedName: string; symbol: ts.Symbol }>[] {
  const symbols: Array<Readonly<{ importedName: string; symbol: ts.Symbol }>> = [];
  const add = (name: ts.Node, importedName: string): void => {
    const symbol = checker.getSymbolAtLocation(name);
    if (symbol !== undefined) symbols.push(Object.freeze({ importedName, symbol }));
  };
  if (ts.isImportDeclaration(node)) {
    const clause = node.importClause;
    if (clause?.name) add(clause.name, "default");
    const bindings = clause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) add(bindings.name, "*");
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) add(element.name, (element.propertyName ?? element.name).text);
    }
  } else if (ts.isImportEqualsDeclaration(node)) {
    add(node.name, "*");
  } else if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
    for (const element of node.exportClause.elements) add(element.name, (element.propertyName ?? element.name).text);
  }
  return Object.freeze(symbols);
}

function symbolHasResolvedDeclaration(symbol: ts.Symbol, checker: ts.TypeChecker): boolean {
  const target = unaliasSymbol(symbol, checker);
  return (target.declarations?.length ?? 0) > 0;
}

function symbolHasConcreteBackendOrigin(
  symbol: ts.Symbol,
  checker: ts.TypeChecker,
  seen: ReadonlySet<ts.Symbol>
): boolean {
  const target = unaliasSymbol(symbol, checker);
  if (seen.has(target)) return false;
  const nextSeen = new Set(seen);
  nextSeen.add(target);

  for (const declaration of target.declarations ?? []) {
    const path = normalizeFileName(declaration.getSourceFile().fileName).toLowerCase();
    if (path.includes("/src/infrastructure/backend/")) {
      const canonical = path.endsWith("/src/infrastructure/backend/ticktickbackend.ts");
      if (!(canonical && (ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration)))) {
        return true;
      }
    }
    if (ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined) {
      const origin = simpleExpressionSymbol(declaration.initializer, checker);
      if (origin !== undefined && symbolHasConcreteBackendOrigin(origin, checker, nextSeen)) return true;
    }
    if (ts.isTypeAliasDeclaration(declaration) && nodeHasConcreteBackendOrigin(declaration.type, checker, nextSeen)) {
      return true;
    }
    if (
      ts.isInterfaceDeclaration(declaration) &&
      declaration.heritageClauses?.some((clause) =>
        clause.types.some((type) => nodeHasConcreteBackendOrigin(type, checker, nextSeen))
      )
    ) {
      return true;
    }
    if (ts.isExportSpecifier(declaration)) {
      const origin = checker.getSymbolAtLocation(declaration.propertyName ?? declaration.name);
      if (origin !== undefined && symbolHasConcreteBackendOrigin(origin, checker, nextSeen)) return true;
    }
  }
  if ((target.flags & ts.SymbolFlags.Module) !== 0) {
    try {
      return checker
        .getExportsOfModule(target)
        .some((candidate) => symbolHasConcreteBackendOrigin(candidate, checker, nextSeen));
    } catch {
      return false;
    }
  }
  return false;
}

function nodeHasConcreteBackendOrigin(node: ts.Node, checker: ts.TypeChecker, seen: ReadonlySet<ts.Symbol>): boolean {
  let concrete = false;
  const visit = (candidate: ts.Node): void => {
    if (concrete) return;
    if (ts.isIdentifier(candidate)) {
      const symbol = checker.getSymbolAtLocation(candidate);
      if (symbol !== undefined && symbolHasConcreteBackendOrigin(symbol, checker, seen)) {
        concrete = true;
        return;
      }
    }
    ts.forEachChild(candidate, visit);
  };
  visit(node);
  return concrete;
}

function unaliasSymbol(symbol: ts.Symbol, checker: ts.TypeChecker): ts.Symbol {
  if ((symbol.flags & ts.SymbolFlags.Alias) === 0) return symbol;
  try {
    return checker.getAliasedSymbol(symbol);
  } catch {
    return symbol;
  }
}

function simpleExpressionSymbol(expression: ts.Expression, checker: ts.TypeChecker): ts.Symbol | undefined {
  const candidate = unwrapExpression(expression);
  if (ts.isIdentifier(candidate)) return checker.getSymbolAtLocation(candidate);
  if (ts.isPropertyAccessExpression(candidate)) return checker.getSymbolAtLocation(candidate.name);
  return undefined;
}

function auditShortcuts(context: AuditContext): void {
  const constants = collectStableConstants(context);
  const provisional = Object.freeze({
    ...context,
    constants,
    shortcutBuilders: new Map<ts.Symbol, number>(),
    verifiedHelpers: new Map<ts.Symbol, 1 | 2>(),
  });
  const verifiedHelpers = collectVerifiedShortcutHelpers(provisional);
  const shortcutBuilders = collectShortcutBuilders(provisional);
  const shortcutContext = Object.freeze({ ...provisional, shortcutBuilders, verifiedHelpers });

  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isIdentifier(node.name)) {
      if (isShortcutBindingName(node.name.text) || typeIsKeyboardShortcut(node.type)) {
        if (!isInsideMappedFunction(node, verifiedHelpers, context.checker)) {
          validateShortcutExpression(node.initializer, shortcutContext, new Set());
        }
      }
    } else if (ts.isPropertyAssignment(node) && propertyName(node.name) === "shortcut") {
      if (
        isShortcutProducerFile(context.sourceFile.fileName) &&
        !isInsideMappedFunction(node, shortcutBuilders, context.checker)
      ) {
        validateShortcutExpression(node.initializer, shortcutContext, new Set());
      }
    } else if (ts.isShorthandPropertyAssignment(node) && node.name.text === "shortcut") {
      if (
        isShortcutProducerFile(context.sourceFile.fileName) &&
        !isInsideMappedFunction(node, shortcutBuilders, context.checker)
      ) {
        validateShortcutExpression(node.name, shortcutContext, new Set());
      }
    } else if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && node.name.text === "shortcut") {
      if (!node.initializer || !ts.isJsxExpression(node.initializer) || !node.initializer.expression) {
        throw violation(context.relativePath, "raycast-shortcut-unresolved");
      }
      validateShortcutExpression(node.initializer.expression, shortcutContext, new Set());
    } else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      isShortcutBindingName(assignmentName(node.left) ?? "")
    ) {
      validateShortcutExpression(node.right, shortcutContext, new Set());
    } else if (
      ts.isSatisfiesExpression(node) &&
      typeIsKeyboardShortcut(node.type) &&
      !isInsideMappedFunction(node, verifiedHelpers, context.checker)
    ) {
      validateShortcutExpression(node.expression, shortcutContext, new Set());
    } else if (ts.isCallExpression(node)) {
      const symbol = context.checker.getSymbolAtLocation(node.expression);
      const shortcutIndex = symbol === undefined ? undefined : shortcutBuilders.get(symbol);
      if (shortcutIndex !== undefined) {
        const shortcut = node.arguments[shortcutIndex];
        if (shortcut === undefined) throw violation(context.relativePath, "raycast-shortcut-unresolved");
        validateShortcutExpression(shortcut, shortcutContext, new Set());
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(context.sourceFile);
}

function collectStableConstants(context: AuditContext): ReadonlyMap<ts.Symbol, ts.Expression> {
  const constants = new Map<ts.Symbol, ts.Expression>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isVariableDeclarationList(node.parent) &&
      (node.parent.flags & ts.NodeFlags.Const) !== 0
    ) {
      const symbol = context.checker.getSymbolAtLocation(node.name);
      if (symbol !== undefined) constants.set(symbol, node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(context.sourceFile);
  return constants;
}

function collectShortcutBuilders(context: ShortcutContext): ReadonlyMap<ts.Symbol, number> {
  const builders = new Map<ts.Symbol, number>();
  if (!isShortcutProducerFile(context.sourceFile.fileName)) return builders;
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      const parameterSymbols = node.parameters.map((parameter) =>
        ts.isIdentifier(parameter.name) ? context.checker.getSymbolAtLocation(parameter.name) : undefined
      );
      const indices = new Set<number>();
      let invalid = false;
      for (const returned of collectOwnReturns(node.body)) {
        const objects = resolveReturnedObjects(returned, context, new Set());
        if (objects === undefined) {
          invalid = true;
          continue;
        }
        for (const object of objects) {
          const value = returnedShortcutValue(object);
          if (value === undefined) {
            invalid = true;
            continue;
          }
          if (value === null) continue;
          const candidate = unwrapExpression(value);
          const symbol = ts.isIdentifier(candidate) ? valueSymbolAtIdentifier(candidate, context.checker) : undefined;
          const index = symbol === undefined ? -1 : parameterSymbols.indexOf(symbol);
          if (index < 0) invalid = true;
          else indices.add(index);
        }
      }
      const returnsShortcut = functionReturnHasShortcut(node, context.checker);
      if (returnsShortcut && (invalid || indices.size !== 1)) {
        throw violation(context.relativePath, "raycast-shortcut-unresolved");
      }
      const symbol = context.checker.getSymbolAtLocation(node.name);
      if (!invalid && indices.size === 1 && symbol !== undefined) builders.set(symbol, [...indices][0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(context.sourceFile);
  return builders;
}

function resolveReturnedObjects(
  expression: ts.Expression,
  context: ShortcutContext,
  seen: ReadonlySet<ts.Symbol>
): readonly ts.ObjectLiteralExpression[] | undefined {
  const candidate = unwrapExpression(expression);
  if (ts.isObjectLiteralExpression(candidate)) return Object.freeze([candidate]);
  if (isObjectFreezeCall(candidate)) return resolveReturnedObjects(candidate.arguments[0], context, seen);
  if (ts.isConditionalExpression(candidate)) {
    const whenTrue = resolveReturnedObjects(candidate.whenTrue, context, seen);
    const whenFalse = resolveReturnedObjects(candidate.whenFalse, context, seen);
    return whenTrue === undefined || whenFalse === undefined ? undefined : Object.freeze([...whenTrue, ...whenFalse]);
  }
  if (!ts.isIdentifier(candidate)) return undefined;
  const symbol = context.checker.getSymbolAtLocation(candidate);
  if (symbol === undefined || seen.has(symbol)) return undefined;
  const initializer = context.constants.get(symbol);
  if (initializer === undefined) return undefined;
  const nextSeen = new Set(seen);
  nextSeen.add(symbol);
  return resolveReturnedObjects(initializer, context, nextSeen);
}

function returnedShortcutValue(object: ts.ObjectLiteralExpression): ts.Expression | null | undefined {
  let value: ts.Expression | null = null;
  for (const element of object.properties) {
    if (ts.isShorthandPropertyAssignment(element)) {
      if (element.name.text !== "shortcut") continue;
      if (value !== null) return undefined;
      value = element.name;
      continue;
    }
    if (!ts.isPropertyAssignment(element)) return undefined;
    const name = propertyName(element.name);
    if (name === undefined) return undefined;
    if (name !== "shortcut") continue;
    if (value !== null) return undefined;
    value = element.initializer;
  }
  return value;
}

function functionReturnHasShortcut(declaration: ts.FunctionDeclaration, checker: ts.TypeChecker): boolean {
  const signature = checker.getSignatureFromDeclaration(declaration);
  return signature !== undefined && checker.getReturnTypeOfSignature(signature).getProperty("shortcut") !== undefined;
}

function collectVerifiedShortcutHelpers(context: ShortcutContext): ReadonlyMap<ts.Symbol, 1 | 2> {
  const helpers = new Map<ts.Symbol, 1 | 2>();
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "platformShortcut") {
      const symbol = context.checker.getSymbolAtLocation(node.name);
      const arity = verifiedHelperArity(node, context);
      if (symbol !== undefined && arity !== undefined) helpers.set(symbol, arity);
      else if (isShortcutProducerFile(node.getSourceFile().fileName)) {
        throw violation(context.relativePath, "raycast-shortcut-unresolved");
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(context.sourceFile);
  return helpers;
}

function verifiedHelperArity(declaration: ts.FunctionDeclaration, context: ShortcutContext): 1 | 2 | undefined {
  if (!declaration.body || (declaration.parameters.length !== 1 && declaration.parameters.length !== 2)) {
    return undefined;
  }
  const parameters = declaration.parameters.map((parameter) =>
    ts.isIdentifier(parameter.name) ? context.checker.getSymbolAtLocation(parameter.name) : undefined
  );
  if (parameters.some((symbol) => symbol === undefined)) return undefined;
  const returns = collectOwnReturns(declaration.body);
  if (returns.length !== 1) return undefined;
  const mapping = resolveObjectLiteral(returns[0], context, new Set());
  if (mapping === undefined) return undefined;
  const branches = exactObjectProperties(mapping, ["macOS", "Windows"]);
  if (branches === undefined) return undefined;
  if (parameters.length === 2) {
    return branchDerivedFromParameter(branches.macOS, parameters[0]!, context, new Set()) &&
      branchDerivedFromParameter(branches.Windows, parameters[1]!, context, new Set())
      ? 2
      : undefined;
  }
  return staticHelperBranch(branches.macOS, parameters[0]!, true, context) &&
    staticHelperBranch(branches.Windows, parameters[0]!, false, context)
    ? 1
    : undefined;
}

function collectOwnReturns(body: ts.Block): readonly ts.Expression[] {
  const returns: ts.Expression[] = [];
  const visit = (node: ts.Node): void => {
    if (node !== body && ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node) && node.expression) returns.push(node.expression);
    else ts.forEachChild(node, visit);
  };
  visit(body);
  return Object.freeze(returns);
}

function branchDerivedFromParameter(
  expression: ts.Expression,
  parameter: ts.Symbol,
  context: ShortcutContext,
  seen: ReadonlySet<ts.Symbol>
): boolean {
  const candidate = unwrapExpression(expression);
  if (ts.isIdentifier(candidate) && valueSymbolAtIdentifier(candidate, context.checker) === parameter) return true;
  const object = resolveObjectLiteral(candidate, context, seen);
  if (object === undefined) return false;
  const fields = exactObjectProperties(object, ["modifiers", "key"]);
  return (
    fields !== undefined &&
    expressionDerivedFromParameter(fields.modifiers, parameter, "modifiers", context, seen) &&
    expressionDerivedFromParameter(fields.key, parameter, "key", context, seen)
  );
}

function expressionDerivedFromParameter(
  expression: ts.Expression,
  parameter: ts.Symbol,
  member: string,
  context: ShortcutContext,
  seen: ReadonlySet<ts.Symbol>
): boolean {
  const candidate = unwrapExpression(expression);
  if (
    ts.isPropertyAccessExpression(candidate) &&
    candidate.name.text === member &&
    ts.isIdentifier(candidate.expression) &&
    valueSymbolAtIdentifier(candidate.expression, context.checker) === parameter
  ) {
    return true;
  }
  if (member === "modifiers" && ts.isArrayLiteralExpression(candidate) && candidate.elements.length === 1) {
    const element = candidate.elements[0];
    return ts.isSpreadElement(element)
      ? expressionDerivedFromParameter(element.expression, parameter, member, context, seen)
      : false;
  }
  if (ts.isIdentifier(candidate)) {
    const symbol = valueSymbolAtIdentifier(candidate, context.checker);
    if (symbol === undefined || seen.has(symbol)) return false;
    const initializer = context.constants.get(symbol);
    if (initializer === undefined) return false;
    const nextSeen = new Set(seen);
    nextSeen.add(symbol);
    return expressionDerivedFromParameter(initializer, parameter, member, context, nextSeen);
  }
  return false;
}

function staticHelperBranch(
  expression: ts.Expression,
  keyParameter: ts.Symbol,
  allowCommand: boolean,
  context: ShortcutContext
): boolean {
  const object = resolveObjectLiteral(expression, context, new Set());
  if (object === undefined) return false;
  const fields = exactObjectProperties(object, ["modifiers", "key"]);
  if (fields === undefined) return false;
  const modifiers = resolveStringArray(fields.modifiers, context, new Set());
  const key = unwrapExpression(fields.key);
  return (
    modifiers !== undefined &&
    (allowCommand || !modifiers.some(isCommandModifier)) &&
    ts.isIdentifier(key) &&
    valueSymbolAtIdentifier(key, context.checker) === keyParameter
  );
}

function validatePlatformShortcutCall(call: ts.CallExpression, arity: 1 | 2, context: ShortcutContext): void {
  if (call.arguments.length !== arity) throw violation(context.relativePath, "raycast-shortcut-unresolved");
  if (arity === 1) {
    if (resolveStaticString(call.arguments[0], context, new Set()) === undefined) {
      throw violation(context.relativePath, "raycast-shortcut-unresolved");
    }
    return;
  }
  validateShortcutBranch(call.arguments[0], true, context);
  validateShortcutBranch(call.arguments[1], false, context);
}

function validateShortcutExpression(
  expression: ts.Expression,
  context: ShortcutContext,
  seen: ReadonlySet<ts.Symbol>
): void {
  const candidate = unwrapExpression(expression);
  if (ts.isObjectLiteralExpression(candidate)) {
    const mapping = exactObjectProperties(candidate, ["macOS", "Windows"]);
    if (mapping !== undefined) {
      validateShortcutBranch(mapping.macOS, true, context);
      validateShortcutBranch(mapping.Windows, false, context);
      return;
    }
    validateShortcutBranch(candidate, false, context);
    return;
  }
  if (ts.isIdentifier(candidate)) {
    const symbol = valueSymbolAtIdentifier(candidate, context.checker);
    if (symbol === undefined || seen.has(symbol)) {
      throw violation(context.relativePath, "raycast-shortcut-unresolved");
    }
    const nextSeen = new Set(seen);
    nextSeen.add(symbol);
    const initializer = context.constants.get(symbol);
    if (initializer !== undefined) {
      validateShortcutExpression(initializer, context, nextSeen);
      return;
    }
    const producerOrigin = shortcutProducerOrigin(symbol, context.checker, new Set());
    if (producerOrigin === "contract") return;
    if (producerOrigin !== undefined) {
      validateShortcutExpression(producerOrigin, context, nextSeen);
      return;
    }
    throw violation(context.relativePath, "raycast-shortcut-unresolved");
  }
  if (ts.isPropertyAccessExpression(candidate) || ts.isElementAccessExpression(candidate)) {
    const symbol = context.checker.getSymbolAtLocation(
      ts.isPropertyAccessExpression(candidate) ? candidate.name : candidate.argumentExpression
    );
    if (symbol !== undefined) {
      const producerOrigin = shortcutProducerOrigin(symbol, context.checker, new Set());
      if (producerOrigin === "contract") return;
      if (producerOrigin !== undefined) {
        validateShortcutExpression(producerOrigin, context, seen);
        return;
      }
    }
    const projected = projectStableProperty(candidate, context, seen);
    if (projected !== undefined) {
      validateShortcutExpression(projected, context, seen);
      return;
    }
    throw violation(context.relativePath, "raycast-shortcut-unresolved");
  }
  if (ts.isCallExpression(candidate) && ts.isIdentifier(candidate.expression)) {
    const symbol = context.checker.getSymbolAtLocation(candidate.expression);
    const arity = symbol === undefined ? undefined : context.verifiedHelpers.get(symbol);
    if (arity !== undefined) {
      validatePlatformShortcutCall(candidate, arity, context);
      return;
    }
  }
  throw violation(context.relativePath, "raycast-shortcut-unresolved");
}

function validateShortcutBranch(expression: ts.Expression, allowCommand: boolean, context: ShortcutContext): void {
  const object = resolveObjectLiteral(expression, context, new Set());
  if (object === undefined) throw violation(context.relativePath, "raycast-shortcut-unresolved");
  const fields = exactObjectProperties(object, ["modifiers", "key"]);
  if (fields === undefined) throw violation(context.relativePath, "raycast-shortcut-unresolved");
  const modifiers = resolveStringArray(fields.modifiers, context, new Set());
  const key = resolveStaticString(fields.key, context, new Set());
  if (modifiers === undefined || key === undefined) {
    throw violation(context.relativePath, "raycast-shortcut-unresolved");
  }
  if (!allowCommand && modifiers.some(isCommandModifier)) {
    throw violation(context.relativePath, "raycast-shortcut-cmd");
  }
}

function resolveObjectLiteral(
  expression: ts.Expression,
  context: ShortcutContext,
  seen: ReadonlySet<ts.Symbol>
): ts.ObjectLiteralExpression | undefined {
  const candidate = unwrapExpression(expression);
  if (ts.isObjectLiteralExpression(candidate)) return candidate;
  if (isObjectFreezeCall(candidate)) return resolveObjectLiteral(candidate.arguments[0], context, seen);
  if (!ts.isIdentifier(candidate)) return undefined;
  const symbol = context.checker.getSymbolAtLocation(candidate);
  if (symbol === undefined || seen.has(symbol)) return undefined;
  const initializer = context.constants.get(symbol);
  if (initializer === undefined) return undefined;
  const nextSeen = new Set(seen);
  nextSeen.add(symbol);
  return resolveObjectLiteral(initializer, context, nextSeen);
}

function exactObjectProperties(
  object: ts.ObjectLiteralExpression,
  expected: readonly string[]
): Record<string, ts.Expression> | undefined {
  const values: Record<string, ts.Expression> = {};
  for (const element of object.properties) {
    if (ts.isShorthandPropertyAssignment(element)) {
      values[element.name.text] = element.name;
      continue;
    }
    if (!ts.isPropertyAssignment(element)) return undefined;
    const name = propertyName(element.name);
    if (name === undefined || Object.prototype.hasOwnProperty.call(values, name)) return undefined;
    values[name] = element.initializer;
  }
  const names = Object.keys(values).sort(compareText);
  const wanted = [...expected].sort(compareText);
  return names.length === wanted.length && names.every((name, index) => name === wanted[index]) ? values : undefined;
}

function resolveStringArray(
  expression: ts.Expression,
  context: ShortcutContext,
  seen: ReadonlySet<ts.Symbol>
): readonly string[] | undefined {
  const candidate = unwrapExpression(expression);
  if (ts.isArrayLiteralExpression(candidate)) {
    const values: string[] = [];
    for (const element of candidate.elements) {
      const value = stringLiteralText(element);
      if (value === undefined) return undefined;
      values.push(value);
    }
    return Object.freeze(values);
  }
  if (isObjectFreezeCall(candidate)) return resolveStringArray(candidate.arguments[0], context, seen);
  if (!ts.isIdentifier(candidate)) return undefined;
  const symbol = context.checker.getSymbolAtLocation(candidate);
  if (symbol === undefined || seen.has(symbol)) return undefined;
  const initializer = context.constants.get(symbol);
  if (initializer === undefined) return undefined;
  const nextSeen = new Set(seen);
  nextSeen.add(symbol);
  return resolveStringArray(initializer, context, nextSeen);
}

function resolveStaticString(
  expression: ts.Expression,
  context: ShortcutContext,
  seen: ReadonlySet<ts.Symbol>
): string | undefined {
  const candidate = unwrapExpression(expression);
  const literal = stringLiteralText(candidate);
  if (literal !== undefined) return literal;
  if (!ts.isIdentifier(candidate)) return undefined;
  const symbol = context.checker.getSymbolAtLocation(candidate);
  if (symbol === undefined || seen.has(symbol)) return undefined;
  const initializer = context.constants.get(symbol);
  if (initializer === undefined) return undefined;
  const nextSeen = new Set(seen);
  nextSeen.add(symbol);
  return resolveStaticString(initializer, context, nextSeen);
}

function projectStableProperty(
  expression: ts.PropertyAccessExpression | ts.ElementAccessExpression,
  context: ShortcutContext,
  seen: ReadonlySet<ts.Symbol>
): ts.Expression | undefined {
  const name = ts.isPropertyAccessExpression(expression)
    ? expression.name.text
    : stringLiteralText(expression.argumentExpression);
  if (name === undefined) return undefined;
  const object = resolveObjectLiteral(expression.expression, context, seen);
  if (object === undefined) return undefined;
  return exactNamedProperty(object, name);
}

function exactNamedProperty(object: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  let value: ts.Expression | undefined;
  for (const element of object.properties) {
    if (ts.isShorthandPropertyAssignment(element) && element.name.text === name) {
      if (value !== undefined) return undefined;
      value = element.name;
    } else if (ts.isPropertyAssignment(element) && propertyName(element.name) === name) {
      if (value !== undefined) return undefined;
      value = element.initializer;
    } else if (ts.isSpreadAssignment(element) || propertyName(element.name) === undefined) {
      return undefined;
    }
  }
  return value;
}

function shortcutProducerOrigin(
  symbol: ts.Symbol,
  checker: ts.TypeChecker,
  seen: ReadonlySet<ts.Symbol>
): ts.Expression | "contract" | undefined {
  const target = unaliasSymbol(symbol, checker);
  if (seen.has(target)) return undefined;
  const nextSeen = new Set(seen);
  nextSeen.add(target);
  for (const declaration of target.declarations ?? []) {
    if (isShortcutProducerFile(declaration.getSourceFile().fileName)) {
      if (ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined) {
        return declaration.initializer;
      }
      if (ts.isPropertySignature(declaration) && propertyName(declaration.name) === "shortcut") {
        return "contract";
      }
    }
    if (ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined) {
      const origin = simpleExpressionSymbol(declaration.initializer, checker);
      if (origin !== undefined) {
        const producer = shortcutProducerOrigin(origin, checker, nextSeen);
        if (producer !== undefined) return producer;
      }
    }
  }
  return undefined;
}

function isShortcutProducerFile(fileName: string): boolean {
  const path = normalizeFileName(fileName).toLowerCase();
  return SHORTCUT_PRODUCERS.some((producer) => path.endsWith("/" + producer.toLowerCase()));
}

function isInsideMappedFunction<Value>(
  node: ts.Node,
  functions: ReadonlyMap<ts.Symbol, Value>,
  checker: ts.TypeChecker
): boolean {
  let candidate: ts.Node | undefined = node.parent;
  while (candidate) {
    if (ts.isFunctionDeclaration(candidate) && candidate.name) {
      const symbol = checker.getSymbolAtLocation(candidate.name);
      return symbol !== undefined && functions.has(symbol);
    }
    candidate = candidate.parent;
  }
  return false;
}

function typeIsKeyboardShortcut(type: ts.TypeNode | undefined): boolean {
  return type !== undefined && /(?:^|\.)Keyboard\.Shortcut$/.test(type.getText().replace(/\s+/g, ""));
}

function isShortcutBindingName(name: string): boolean {
  return name === "shortcut" || name === "SHORTCUT" || name.endsWith("Shortcut") || name.endsWith("_SHORTCUT");
}

function assignmentName(expression: ts.Expression): string | undefined {
  const candidate = unwrapExpression(expression);
  if (ts.isIdentifier(candidate)) return candidate.text;
  if (ts.isPropertyAccessExpression(candidate)) return candidate.name.text;
  if (ts.isElementAccessExpression(candidate)) return stringLiteralText(candidate.argumentExpression);
  return undefined;
}

function isCommandModifier(value: string): boolean {
  return value.toLowerCase() === "cmd";
}

function isObjectFreezeCall(expression: ts.Expression): expression is ts.CallExpression {
  return (
    ts.isCallExpression(expression) &&
    expression.arguments.length === 1 &&
    ts.isPropertyAccessExpression(expression.expression) &&
    ts.isIdentifier(expression.expression.expression) &&
    expression.expression.expression.text === "Object" &&
    expression.expression.name.text === "freeze"
  );
}

function isDirectGlobalRequireCall(node: ts.CallExpression, checker: ts.TypeChecker): boolean {
  return ts.isIdentifier(node.expression) && isGlobalRequireIdentifier(node.expression, checker);
}

function isGlobalRequireIdentifier(node: ts.Identifier, checker: ts.TypeChecker): boolean {
  if (node.text !== "require") return false;
  const symbol = checker.getSymbolAtLocation(node);
  return (
    symbol === undefined ||
    !(symbol.declarations ?? []).some((declaration) => declaration.getSourceFile() === node.getSourceFile())
  );
}

function isImmediateCreateRequireLoad(
  node: ts.CallExpression,
  symbols: ReadonlySet<ts.Symbol>,
  checker: ts.TypeChecker
): boolean {
  return ts.isCallExpression(node.expression) && isCreateRequireFactoryCall(node.expression, symbols, checker);
}

function isCreateRequireFactoryCall(
  node: ts.CallExpression,
  symbols: ReadonlySet<ts.Symbol>,
  checker: ts.TypeChecker
): boolean {
  return ts.isIdentifier(node.expression) && symbolInSet(node.expression, symbols, checker);
}

function isSafeCreateRequireIdentifierUse(node: ts.Identifier): boolean {
  if (!ts.isCallExpression(node.parent) || node.parent.expression !== node) return false;
  const factory = node.parent;
  return ts.isCallExpression(factory.parent) && factory.parent.expression === factory;
}

function isImportBindingName(node: ts.Identifier): boolean {
  return (
    (ts.isImportSpecifier(node.parent) && node.parent.name === node) ||
    (ts.isImportClause(node.parent) && node.parent.name === node) ||
    (ts.isNamespaceImport(node.parent) && node.parent.name === node)
  );
}

function symbolInSet(node: ts.Identifier, symbols: ReadonlySet<ts.Symbol>, checker: ts.TypeChecker): boolean {
  const symbol = checker.getSymbolAtLocation(node);
  return symbol !== undefined && symbols.has(symbol);
}

function valueSymbolAtIdentifier(node: ts.Identifier, checker: ts.TypeChecker): ts.Symbol | undefined {
  return ts.isShorthandPropertyAssignment(node.parent)
    ? checker.getShorthandAssignmentValueSymbol(node.parent) ?? checker.getSymbolAtLocation(node)
    : checker.getSymbolAtLocation(node);
}

function requireStaticSpecifier(relativePath: string, node: ts.Node | undefined): string {
  const specifier = stringLiteralText(node);
  if (specifier === undefined) throw violation(relativePath, "nonliteral-module-load");
  return specifier;
}

function stringLiteralText(node: ts.Node | undefined): string | undefined {
  return node !== undefined && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : undefined;
}

function literalTypeText(node: ts.TypeNode): string | undefined {
  return ts.isLiteralTypeNode(node) ? stringLiteralText(node.literal) : undefined;
}

function entityNameParts(name: ts.EntityName): string[] {
  return ts.isIdentifier(name) ? [name.text] : [...entityNameParts(name.left), name.right.text];
}

function propertyName(name: ts.PropertyName): string | undefined {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name) ? name.text : undefined;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let candidate = expression;
  while (
    ts.isParenthesizedExpression(candidate) ||
    ts.isAsExpression(candidate) ||
    ts.isTypeAssertionExpression(candidate) ||
    ts.isSatisfiesExpression(candidate) ||
    ts.isNonNullExpression(candidate)
  ) {
    candidate = candidate.expression;
  }
  return candidate;
}

function isPackage(specifier: string, packageName: string): boolean {
  return specifier === packageName || specifier.startsWith(packageName + "/");
}

function isNodeModuleSpecifier(specifier: string): boolean {
  return specifier === "module" || specifier === "node:module";
}

function isExternalModule(specifier: string): boolean {
  return !specifier.startsWith(".") && !specifier.startsWith("/") && !/^[a-z]:[/\\]/i.test(specifier);
}

function isBackendModuleSpecifier(specifier: string): boolean {
  const normalized = specifier.replaceAll("\\", "/");
  return /(?:^|\/)infrastructure\/backend(?:\/|$)/i.test(normalized);
}

function normalizeFileName(fileName: string): string {
  return resolve(fileName).replaceAll("\\", "/");
}

/**
 * This Windows-only package ships no macOS compatibility shim: any relative
 * import that resolves to the retired src/service/osScript.ts path is a
 * boundary violation rather than a lifecycle state.
 */
function assertLegacyShimLifecycle(
  sourceRoot: string,
  files: readonly ProductionSourceFile[],
  parsed: ReadonlyMap<string, ParsedSource>
): void {
  const shimPath = resolve(sourceRoot, "service/osScript.ts");
  const shimBase = stripTypeScriptExtension(shimPath);
  const consumers = files.filter((file) =>
    (parsed.get(file.relativePath)?.references ?? []).some(
      (specifier) =>
        specifier.startsWith(".") &&
        stripTypeScriptExtension(resolve(dirname(file.absolutePath), specifier)) === shimBase
    )
  );
  if (consumers.length > 0 || files.some(({ relativePath }) => relativePath === LEGACY_SHIM_RELATIVE_PATH)) {
    throw new Error(LEGACY_SHIM_REMOVAL_MESSAGE);
  }
}

function stripTypeScriptExtension(path: string): string {
  return path.replace(/\.tsx?$/i, "");
}

function violation(relativePath: string, boundary: string): Error {
  return new Error(relativePath + ": " + boundary + " boundary violation.");
}

function withTemporarySourceRoot<Result>(operation: (sourceRoot: string, sandbox: string) => Result): Result {
  const sandbox = mkdtempSync(join(tmpdir(), "ticktick-regression-"));
  const sourceRoot = join(sandbox, "src");
  mkdirSync(sourceRoot, { recursive: true });
  try {
    return operation(sourceRoot, sandbox);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

function writeFixture(sourceRoot: string, relativePath: string, contents = "export {};\n"): void {
  const path = join(sourceRoot, ...relativePath.split("/"));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, "utf8");
}

describe("production source enumeration", () => {
  it("enumerates normalized production TypeScript paths deterministically and excludes non-production trees", () => {
    withTemporarySourceRoot((sourceRoot) => {
      writeFixture(sourceRoot, "z.ts");
      writeFixture(sourceRoot, "a.tsx");
      writeFixture(sourceRoot, "ignored.test.ts");
      writeFixture(sourceRoot, "types.d.ts");
      writeFixture(sourceRoot, "generated/ignored.ts");
      writeFixture(sourceRoot, "test/fixtures/private.ts");
      writeFixture(sourceRoot, "infrastructure/mcp/contract/no-touch.ts");
      expect(enumerateProductionSources(sourceRoot).map(({ relativePath }) => relativePath)).toEqual([
        "src/a.tsx",
        "src/z.ts",
      ]);
    });
  });

  it("rejects symbolic links and independently rejects real paths escaping the source root", () => {
    withTemporarySourceRoot((sourceRoot, sandbox) => {
      const outside = join(sandbox, "outside");
      mkdirSync(outside);
      symlinkSync(outside, join(sourceRoot, "linked"), process.platform === "win32" ? "junction" : "dir");
      expect(() => enumerateProductionSources(sourceRoot)).toThrowError(
        "src/linked: symbolic-link boundary violation."
      );
      expect(() =>
        requireWithinSourceRoot(realpathSync.native(sourceRoot), realpathSync.native(outside), "src/escape.ts")
      ).toThrowError("src/escape.ts: source-root-escape boundary violation.");
    });
  });
});

describe("module and capability boundaries", () => {
  it("ignores comments, inert strings, shadowed require, and unrelated domain words", () => {
    const source = [
      '// import { exec } from "node:child_process";',
      'const text = "run-applescript import analytics modifiers cmd";',
      'function require() { return { Keychain: "domain" }; }',
      'const domain = require("@raycast/api");',
      "export { text, domain };",
    ].join("\n");
    expect(() => auditSourceText("src/commands/inert.ts", source)).not.toThrow();
  });

  it("rejects forbidden dynamic, computed, subprocess, analytics, and executable modules", () => {
    expect(() => auditSourceText("src/commands/dynamic.ts", 'void import("node:child_process");')).toThrowError(
      "src/commands/dynamic.ts: subprocess-capability boundary violation."
    );
    expect(() => auditSourceText("src/commands/computed.ts", "void import(target);")).toThrowError(
      "src/commands/computed.ts: nonliteral-module-load boundary violation."
    );
    expect(() => auditSourceText("src/platform/analytics.ts", 'import "posthog-js";')).toThrowError(
      "src/platform/analytics.ts: analytics-telemetry-capability boundary violation."
    );
    expect(() => auditSourceText("src/platform/executable.ts", 'import "execa";')).toThrowError(
      "src/platform/executable.ts: executable-download-install-capability boundary violation."
    );
  });

  it("allows run-applescript only below macOS infrastructure", () => {
    expect(() =>
      auditSourceText("src/infrastructure/macos/adapter.ts", 'import { runAppleScript } from "run-applescript";')
    ).not.toThrow();
    expect(() => auditSourceText("src/commands/adapter.ts", 'import "run-applescript";')).toThrowError(
      "src/commands/adapter.ts: run-applescript-location boundary violation."
    );
  });

  it.each([
    ["namespace", 'import * as Raycast from "@raycast/api"; void Raycast.Icon;'],
    ["default", 'import Raycast from "@raycast/api"; void Raycast.Icon;'],
  ])("rejects broad Raycast API %s imports at their source", (_kind, source) => {
    expect(() => auditSourceText("src/platform/raycastObject.ts", source)).toThrowError(
      "src/platform/raycastObject.ts: raycast-keychain-capability boundary violation."
    );
  });

  it.each([
    ["namespace", 'import * as Utils from "@raycast/utils"; void Utils.usePromise;'],
    ["default", 'import Utils from "@raycast/utils"; void Utils.usePromise;'],
  ])("rejects broad Raycast utils %s imports at their source", (_kind, source) => {
    expect(() => auditSourceText("src/platform/utilsObject.ts", source)).toThrowError(
      "src/platform/utilsObject.ts: executable-download-install-capability boundary violation."
    );
  });

  it("allows harmless named imports and rejects denied named capabilities", () => {
    expect(() =>
      auditSourceText(
        "src/platform/safe.ts",
        'import { Icon } from "@raycast/api"; import { usePromise } from "@raycast/utils"; void Icon; void usePromise;'
      )
    ).not.toThrow();
    expect(() =>
      auditSourceText("src/platform/keychain.ts", 'import { Keychain as Vault } from "@raycast/api"; void Vault;')
    ).toThrowError("src/platform/keychain.ts: raycast-keychain-capability boundary violation.");
    expect(() =>
      auditSourceText("src/platform/download.ts", 'import { downloadFile } from "@raycast/utils"; void downloadFile;')
    ).toThrowError("src/platform/download.ts: executable-download-install-capability boundary violation.");
  });

  it("rejects escaped loaders while allowing immediate static Raycast selections", () => {
    expect(() => auditSourceText("src/platform/escapedRequire.ts", "const load = require; void load;")).toThrowError(
      "src/platform/escapedRequire.ts: nonliteral-module-load boundary violation."
    );
    expect(() =>
      auditSourceText(
        "src/platform/escapedCreateRequire.ts",
        'import { createRequire } from "node:module"; const load = createRequire(import.meta.url); void load;'
      )
    ).toThrowError("src/platform/escapedCreateRequire.ts: nonliteral-module-load boundary violation.");
    for (const member of ["Cache", "OAuth", "LocalStorage"]) {
      const source =
        'import { createRequire } from "node:module"; const { ' +
        member +
        ' } = createRequire(__filename)("@raycast/api") as typeof import("@raycast/api"); void ' +
        member +
        ";";
      expect(() => auditSourceText("src/platform/immediateRequire.ts", source)).not.toThrow();
    }
  });

  it.each([
    [
      "the legacy module specifier",
      'import { createRequire } from "module"; const load = createRequire(import.meta.url); const { Keychain } = load("@raycast/api");',
    ],
    [
      "a node:module namespace",
      'import * as Module from "node:module"; const load = Module.createRequire(import.meta.url); const { Keychain } = load("@raycast/api");',
    ],
  ])("rejects createRequire escape through %s", (_kind, source) => {
    expect(() => auditSourceText("src/platform/escapedCreateRequireVariant.ts", source)).toThrowError(
      "src/platform/escapedCreateRequireVariant.ts: nonliteral-module-load boundary violation."
    );
  });

  it.each([
    [
      "a CommonJS destructure",
      'const { createRequire } = require("node:module"); const load = createRequire(import.meta.url); const { Keychain } = load("@raycast/api");',
    ],
    [
      "an import-equals module object",
      'import Module = require("node:module"); const load = Module.createRequire(import.meta.url); const { Keychain } = load("@raycast/api");',
    ],
  ])("rejects non-ESM createRequire acquisition through %s", (_kind, source) => {
    expect(() => auditSourceText("src/platform/commonJsCreateRequire.ts", source)).toThrowError(
      "src/platform/commonJsCreateRequire.ts: nonliteral-module-load boundary violation."
    );
  });

  it("rejects re-exporting createRequire at the source boundary", () => {
    withTemporarySourceRoot((sourceRoot) => {
      writeFixture(sourceRoot, "platform/moduleBridge.ts", 'export { createRequire } from "node:module";');
      writeFixture(
        sourceRoot,
        "platform/escape.ts",
        'import { createRequire } from "./moduleBridge"; const load = createRequire(import.meta.url); void load;'
      );
      expect(() => auditProductionTree(sourceRoot)).toThrowError(
        "src/platform/moduleBridge.ts: nonliteral-module-load boundary violation."
      );
    });
  });

  it("allows harmless type-only module members and rejects Keychain", () => {
    expect(() =>
      auditSourceText("src/platform/iconType.ts", 'export type IconType = typeof import("@raycast/api").Icon;')
    ).not.toThrow();
    expect(() =>
      auditSourceText("src/platform/keychainType.ts", 'export type Vault = typeof import("@raycast/api").Keychain;')
    ).toThrowError("src/platform/keychainType.ts: raycast-keychain-capability boundary violation.");
  });

  it("uses public TypeScript diagnostics for TS and TSX without exposing source text", () => {
    expect(() => parseTypeScriptSource("src/commands/broken.ts", "const PRIVATE = ;")).toThrowError(
      "src/commands/broken.ts: typescript-parse boundary violation."
    );
    expect(() => parseTypeScriptSource("src/components/broken.tsx", "const View = () => <div>;")).toThrowError(
      "src/components/broken.tsx: typescript-parse boundary violation."
    );
    expect(parseTypeScriptSource("src/components/View.TSX", "const View = () => <div />;").languageVariant).toBe(
      ts.LanguageVariant.JSX
    );
  });
});

describe("concrete backend boundaries", () => {
  it("rejects direct concrete types and broad backend barrels while allowing the canonical port", () => {
    expect(() =>
      auditSourceText(
        "src/hooks/concrete.ts",
        'import type { McpTickTickBackend as Runtime } from "../runtime"; export type Value = Runtime;'
      )
    ).toThrowError("src/hooks/concrete.ts: concrete-backend-import boundary violation.");
    expect(() =>
      auditSourceText("src/commands/barrel.ts", 'import * as Backends from "../infrastructure/backend"; void Backends;')
    ).toThrowError("src/commands/barrel.ts: concrete-backend-import boundary violation.");
    expect(() =>
      auditSourceText(
        "src/components/port.ts",
        'import type { TickTickBackend, BackendCapabilities } from "../infrastructure/backend/TickTickBackend"; export type Port = TickTickBackend; export type Caps = BackendCapabilities;'
      )
    ).not.toThrow();
  });

  it.each([
    [
      "a renamed barrel export",
      "export class McpTickTickBackend {}",
      'export { McpTickTickBackend as Runtime } from "./implementation";',
      'import { Runtime } from "../infrastructure/backend"; export const backend = new Runtime();',
    ],
    [
      "a simple assignment bridge",
      "export class InternalRuntime {}",
      'import { InternalRuntime } from "../infrastructure/backend/implementation"; export const Runtime = InternalRuntime;',
      'import { Runtime } from "../platform/bridge"; export const backend = new Runtime();',
    ],
  ])("follows concrete backend provenance through %s", (_kind, implementation, bridge, consumer) => {
    withTemporarySourceRoot((sourceRoot) => {
      writeFixture(sourceRoot, "infrastructure/backend/implementation.ts", implementation);
      writeFixture(
        sourceRoot,
        _kind.includes("assignment") ? "platform/bridge.ts" : "infrastructure/backend/index.ts",
        bridge
      );
      writeFixture(sourceRoot, "commands/useBackend.ts", consumer);
      expect(() => auditProductionTree(sourceRoot)).toThrowError(
        "src/commands/useBackend.ts: concrete-backend-import boundary violation."
      );
    });
  });

  it("allows an unrelated domain BackendFactory", () => {
    withTemporarySourceRoot((sourceRoot) => {
      writeFixture(sourceRoot, "domain/model.ts", "export class BackendFactory {}");
      writeFixture(
        sourceRoot,
        "commands/useDomain.ts",
        'import { BackendFactory } from "../domain/model"; export const factory = new BackendFactory();'
      );
      expect(() => auditProductionTree(sourceRoot)).not.toThrow();
    });
  });

  it("follows concrete backend provenance through a type alias bridge", () => {
    withTemporarySourceRoot((sourceRoot) => {
      writeFixture(sourceRoot, "infrastructure/backend/implementation.ts", "export class InternalRuntime {}");
      writeFixture(
        sourceRoot,
        "platform/bridge.ts",
        'import type { InternalRuntime } from "../infrastructure/backend/implementation"; export type Runtime = InternalRuntime;'
      );
      writeFixture(
        sourceRoot,
        "commands/useBackend.ts",
        'import type { Runtime } from "../platform/bridge"; export type Active = Runtime;'
      );
      expect(() => auditProductionTree(sourceRoot)).toThrowError(
        "src/commands/useBackend.ts: concrete-backend-import boundary violation."
      );
    });
  });

  it("follows concrete backend provenance through interface inheritance", () => {
    withTemporarySourceRoot((sourceRoot) => {
      writeFixture(sourceRoot, "infrastructure/backend/implementation.ts", "export class InternalRuntime {}");
      writeFixture(
        sourceRoot,
        "platform/bridge.ts",
        'import type { InternalRuntime } from "../infrastructure/backend/implementation"; export interface Runtime extends InternalRuntime {}'
      );
      writeFixture(
        sourceRoot,
        "commands/useBackend.ts",
        'import type { Runtime } from "../platform/bridge"; export type Active = Runtime;'
      );
      expect(() => auditProductionTree(sourceRoot)).toThrowError(
        "src/commands/useBackend.ts: concrete-backend-import boundary violation."
      );
    });
  });
});

describe("Raycast shortcut boundaries", () => {
  it("allows exact platform mappings and a verified platform helper", () => {
    const source = [
      "function platformShortcut(macOS, Windows) { return { macOS, Windows }; }",
      'const directShortcut = { macOS: { modifiers: ["cmd"], key: "r" }, Windows: { modifiers: ["ctrl"], key: "r" } };',
      'const helperShortcut = platformShortcut({ modifiers: ["cmd"], key: "f" }, { modifiers: ["ctrl"], key: "f" });',
      "export { directShortcut, helperShortcut };",
    ].join("\n");
    expect(() => auditSourceText("src/components/safeShortcut.ts", source)).not.toThrow();
  });

  it("rejects universal and Windows command-only shortcuts", () => {
    expect(() =>
      auditSourceText("src/components/universal.ts", 'export const shortcut = { modifiers: ["cmd"], key: "r" };')
    ).toThrowError("src/components/universal.ts: raycast-shortcut-cmd boundary violation.");
    expect(() =>
      auditSourceText(
        "src/components/windows.ts",
        'export const shortcut = { macOS: { modifiers: ["cmd"], key: "r" }, Windows: { modifiers: ["cmd"], key: "r" } };'
      )
    ).toThrowError("src/components/windows.ts: raycast-shortcut-cmd boundary violation.");
  });

  it("ignores cmd-shaped domain objects that are not shortcut sinks", () => {
    expect(() =>
      auditSourceText(
        "src/components/domain.ts",
        'const options = { modifiers: ["cmd"], key: "domain-key" }; export { options };'
      )
    ).not.toThrow();
    expect(() =>
      auditSourceText(
        "src/components/domainShortcut.ts",
        'export const domain = { shortcut: { modifiers: ["cmd"], key: "domain-key" } };'
      )
    ).not.toThrow();
    expect(() => auditSourceText("src/domain/model.ts", 'export const shortcutLabel = "cmd";')).not.toThrow();
  });

  it.each([
    ["a call", "getShortcut()"],
    ["a computed value", "choices[current]"],
    ["a spread", '{ ...base, key: "r" }'],
    ["a cycle", "first", "const first = second; const second = first;"],
  ])("fails closed for %s at a JSX shortcut sink", (_kind, expression, setup = "") => {
    const source =
      "declare const Action: any; declare const choices: any; declare const current: any; declare const base: any; " +
      setup +
      " export const view = <Action shortcut={" +
      expression +
      "} />;";
    expect(() => auditSourceText("src/components/unresolved.tsx", source)).toThrowError(
      "src/components/unresolved.tsx: raycast-shortcut-unresolved boundary violation."
    );
  });

  it("rejects an unresolved modifiers producer and a swapped platform helper", () => {
    expect(() =>
      auditSourceText(
        "src/components/modifiers.tsx",
        'declare const Action: any; export const view = <Action shortcut={{ modifiers: getModifiers(), key: "r" }} />;'
      )
    ).toThrowError("src/components/modifiers.tsx: raycast-shortcut-unresolved boundary violation.");
    const swapped = [
      "function platformShortcut(macOS, Windows) { return { macOS: Windows, Windows: macOS }; }",
      'export const shortcut = platformShortcut({ modifiers: ["cmd"], key: "r" }, { modifiers: ["ctrl"], key: "r" });',
    ].join("\n");
    expect(() => auditSourceText("src/components/swapped.ts", swapped)).toThrowError(
      "src/components/swapped.ts: raycast-shortcut-unresolved boundary violation."
    );
  });

  it("rejects projecting a macOS branch into a universal sink", () => {
    const source = [
      'const mapping = { macOS: { modifiers: ["cmd"], key: "r" }, Windows: { modifiers: ["ctrl"], key: "r" } };',
      "export const shortcut = mapping.macOS;",
    ].join("\n");
    expect(() => auditSourceText("src/components/projected.ts", source)).toThrowError(
      "src/components/projected.ts: raycast-shortcut-cmd boundary violation."
    );
  });

  it.each([
    [
      "a universal command shortcut",
      'export const unsafeValue = { modifiers: ["cmd"], key: "r" } as const;',
      "raycast-shortcut-cmd",
    ],
    ["an unresolved shortcut", "export const unsafeValue = getShortcut();", "raycast-shortcut-unresolved"],
  ])("validates %s exported by a listed producer before trusting it", (_kind, producer, boundary) => {
    withTemporarySourceRoot((sourceRoot) => {
      writeFixture(sourceRoot, "keyboardShortcuts.ts", producer);
      writeFixture(
        sourceRoot,
        "components/View.tsx",
        'import { unsafeValue } from "../keyboardShortcuts"; declare const Action: any; export const view = <Action shortcut={unsafeValue} />;'
      );
      expect(() => auditProductionTree(sourceRoot)).toThrowError(
        "src/components/View.tsx: " + boundary + " boundary violation."
      );
    });
  });

  it("discovers the shortcut parameter of a producer builder structurally", () => {
    withTemporarySourceRoot((sourceRoot) => {
      writeFixture(
        sourceRoot,
        "keyboardShortcuts.ts",
        [
          "export interface Item { shortcut: any }",
          "function descriptor(key, title, checked, shortcut): Item { return { shortcut }; }",
          'const safe = { macOS: { modifiers: ["cmd"], key: "s" }, Windows: { modifiers: ["ctrl"], key: "s" } };',
          'export const action = descriptor("x", "x", safe, { modifiers: ["cmd"], key: "r" });',
        ].join("\n")
      );
      writeFixture(
        sourceRoot,
        "components/View.tsx",
        'import { action } from "../keyboardShortcuts"; declare const Action: any; export const view = <Action shortcut={action.shortcut} />;'
      );
      expect(() => auditProductionTree(sourceRoot)).toThrowError(
        "src/keyboardShortcuts.ts: raycast-shortcut-cmd boundary violation."
      );
    });
  });

  it("rejects a producer builder whose returned shortcut is not derived from the validated parameter", () => {
    withTemporarySourceRoot((sourceRoot) => {
      writeFixture(
        sourceRoot,
        "keyboardShortcuts.ts",
        [
          "export interface Item { shortcut: any }",
          "declare function getUnsafeItem(): Item;",
          "function build(shortcut): Item { void { shortcut }; return getUnsafeItem(); }",
          'const safe = { macOS: { modifiers: ["cmd"], key: "s" }, Windows: { modifiers: ["ctrl"], key: "s" } };',
          "export const action = build(safe);",
        ].join("\n")
      );
      writeFixture(
        sourceRoot,
        "components/View.tsx",
        'import { action } from "../keyboardShortcuts"; declare const Action: any; export const view = <Action shortcut={action.shortcut} />;'
      );
      expect(() => auditProductionTree(sourceRoot)).toThrowError(
        "src/keyboardShortcuts.ts: raycast-shortcut-unresolved boundary violation."
      );
    });
  });
});

describe("compatibility shim lifecycle", () => {
  it("rejects both the retired shim file and any consumer of its path", () => {
    withTemporarySourceRoot((sourceRoot) => {
      writeFixture(sourceRoot, "consumer.ts", 'import "./service/osScript";');
      expect(() => auditProductionTree(sourceRoot)).toThrowError(LEGACY_SHIM_REMOVAL_MESSAGE);
    });
    withTemporarySourceRoot((sourceRoot) => {
      writeFixture(sourceRoot, "service/osScript.ts");
      expect(() => auditProductionTree(sourceRoot)).toThrowError(LEGACY_SHIM_REMOVAL_MESSAGE);
    });
  });
});

describe("real TickTick production tree boundaries", () => {
  it("passes the deterministic AST audit without any legacy shim and preserves the producers", () => {
    const paths = auditProductionTree(SOURCE_ROOT);
    expect(paths).toEqual([...paths].sort(compareText));
    expect(paths).not.toContain(LEGACY_SHIM_RELATIVE_PATH);
    expect(paths).toEqual(expect.arrayContaining([...SHORTCUT_PRODUCERS]));
    expect(paths.some((path) => path.startsWith("src/test/"))).toBe(false);
    expect(paths.some((path) => path.startsWith("src/" + NO_TOUCH_CONTRACT_DIRECTORY + "/"))).toBe(false);
  });
});
