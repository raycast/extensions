import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { REAL, realGate, RUN_REAL } from "./real-fabric";

// A plain `bun test` must never start real fabric: it reads fabric's .env and config.

const walk = (n: ts.Node, fn: (n: ts.Node) => void) => {
  fn(n);
  ts.forEachChild(n, (c) => walk(c, fn));
};

// `!RUN_REAL` as one disjunct of the skip condition (`!RUN_REAL || !existsSync(x)` still gates).
const gatesOnRunReal = (cond: ts.Expression | undefined, sf: ts.SourceFile): boolean => {
  if (!cond) return false;
  if (ts.isParenthesizedExpression(cond)) return gatesOnRunReal(cond.expression, sf);
  if (ts.isBinaryExpression(cond) && cond.operatorToken.kind === ts.SyntaxKind.BarBarToken)
    return gatesOnRunReal(cond.left, sf) || gatesOnRunReal(cond.right, sf);
  return cond.getText(sf).replace(/\s/g, "") === "!RUN_REAL";
};

/** Inside a `<x>.skipIf(<gate>)(...)` call. */
const gated = (n: ts.Node, sf: ts.SourceFile): boolean => {
  for (let p = n.parent; p; p = p.parent) {
    if (!ts.isCallExpression(p) || !ts.isCallExpression(p.expression)) continue;
    const skip = p.expression;
    if (
      ts.isPropertyAccessExpression(skip.expression) &&
      skip.expression.name.text === "skipIf" &&
      gatesOnRunReal(skip.arguments[0], sf)
    )
      return true;
  }
  return false;
};

const HOMEBREW = /^\/(opt\/homebrew|usr\/local)\/bin\/fabric(-ai)?$/;
const SPAWNERS = new Set(["runFabric", "spawn", "spawnSync", "execFile", "execFileSync"]);
const calleeName = (e: ts.Expression) =>
  ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : undefined;
const isDeclarationName = (n: ts.Identifier) =>
  ts.isImportSpecifier(n.parent) ||
  ts.isNamespaceImport(n.parent) ||
  (ts.isVariableDeclaration(n.parent) && n.parent.name === n);

/**
 * Line numbers (1-based) where real fabric is used outside test.skipIf(!RUN_REAL …), and how many
 * uses there were in all. Two kinds of use:
 * - REAL from ./real-fabric (any alias or namespace, and any const copied from it or from a
 *   Homebrew path): EVERY reference counts, so passing it on through a variable, a template or a
 *   helper is still seen.
 * - A Homebrew fabric literal or src's DEFAULT_FABRIC_PATH: only where it starts a process
 *   (runFabric, spawn, execFile…) or sets a fabricPath, since tests also compare those strings.
 */
export function realUses(source: string, fileName: string): { uses: number; ungated: number[] } {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const pinned = new Set<string>();
  const namespaces = new Set<string>();
  walk(sf, (n) => {
    if (!ts.isImportDeclaration(n) || !ts.isStringLiteral(n.moduleSpecifier)) return;
    if (!/(^|\/)real-fabric(\.ts)?$/.test(n.moduleSpecifier.text)) return;
    const b = n.importClause?.namedBindings;
    if (b && ts.isNamespaceImport(b)) namespaces.add(b.name.text);
    if (b && ts.isNamedImports(b))
      for (const s of b.elements) if ((s.propertyName ?? s.name).text === "REAL") pinned.add(s.name.text);
  });
  const isPinnedRef = (e: ts.Node): boolean =>
    (ts.isIdentifier(e) && pinned.has(e.text)) ||
    (ts.isPropertyAccessExpression(e) &&
      e.name.text === "REAL" &&
      ts.isIdentifier(e.expression) &&
      namespaces.has(e.expression.text));
  // Consts copied from a pinned name or a Homebrew literal are pinned too (to a fixed point).
  for (let grew = true; grew;) {
    grew = false;
    walk(sf, (n) => {
      if (!ts.isVariableDeclaration(n) || !ts.isIdentifier(n.name) || !n.initializer || pinned.has(n.name.text)) return;
      const i = n.initializer;
      if (isPinnedRef(i) || (ts.isStringLiteralLike(i) && HOMEBREW.test(i.text))) {
        pinned.add(n.name.text);
        grew = true;
      }
    });
  }
  const siteReal = (e: ts.Node | undefined) =>
    !!e &&
    ((ts.isStringLiteralLike(e) && HOMEBREW.test(e.text)) || (ts.isIdentifier(e) && e.text === "DEFAULT_FABRIC_PATH"));

  let uses = 0;
  const ungated: number[] = [];
  const use = (n: ts.Node) => {
    uses++;
    if (!gated(n, sf)) ungated.push(sf.getLineAndCharacterOfPosition(n.getStart()).line + 1);
  };
  walk(sf, (n) => {
    if (ts.isIdentifier(n) && pinned.has(n.text) && !isDeclarationName(n)) {
      // `ns.REAL` is counted once, at the property access below; a property name `x.REAL` isn't a use.
      if (!(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) use(n);
      return;
    }
    if (isPinnedRef(n) && ts.isPropertyAccessExpression(n)) return use(n);
    const site =
      (ts.isCallExpression(n) && SPAWNERS.has(calleeName(n.expression) ?? "") && n.arguments[0]) ||
      ((ts.isPropertyAssignment(n) || ts.isJsxAttribute(n)) &&
        n.name.getText(sf) === "fabricPath" &&
        (ts.isJsxAttribute(n)
          ? n.initializer && ts.isJsxExpression(n.initializer) && n.initializer.expression
          : n.initializer)) ||
      (ts.isBinaryExpression(n) &&
        n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(n.left) &&
        n.left.name.text === "fabricPath" &&
        n.right);
    if (site && siteReal(site)) use(n);
  });
  return { uses, ungated };
}

describe("real fabric runs only under FABRIC_REAL=1", () => {
  test("FABRIC_REAL=1 without the binary fails instead of skipping", () => {
    expect(() => realGate({ FABRIC_REAL: "1" }, false)).toThrow(/missing/);
    expect(realGate({ FABRIC_REAL: "1" }, true)).toBe(true);
    expect(realGate({}, true)).toBe(false);
  });

  // RUN_REAL as the module computes it, read in a separate process with a controlled env (an
  // in-process check would be the same expression twice). Nothing here starts fabric.
  test("RUN_REAL is false unless FABRIC_REAL is exactly 1", () => {
    const runReal = (FABRIC_REAL: string | undefined) => {
      const env = { ...process.env, FABRIC_REAL };
      if (FABRIC_REAL === undefined) delete env.FABRIC_REAL;
      const r = spawnSync(
        process.execPath,
        [
          "-e",
          `import { RUN_REAL } from ${JSON.stringify(join(import.meta.dir, "real-fabric.ts"))}; console.log(RUN_REAL)`,
        ],
        { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
      return r.stdout.trim();
    };
    expect([undefined, "", "0", "true", "yes"].map(runReal)).toEqual(["false", "false", "false", "false", "false"]);
  });

  // The checker's own verdicts on known shapes, so a guard that reports nothing can't pass.
  test("the checker flags ungated uses in every spelling and passes gated ones", () => {
    const lines = (src: string, name = "t.ts") => realUses(src, name).ungated;
    const IMPORT = 'import { REAL, RUN_REAL } from "./real-fabric";\n';
    const gatedTest = (cond: string, body: string) => `${IMPORT}test.skipIf(${cond})("t", () => { ${body} });\n`;

    expect(lines(gatedTest("!RUN_REAL", "runFabric(REAL, []);"))).toEqual([]);
    expect(lines(gatedTest("!RUN_REAL || !existsSync(x)", "runFabric(REAL, []);"))).toEqual([]);
    expect(lines(gatedTest("(!RUN_REAL)", "runFabric(REAL, []);"))).toEqual([]);
    expect(lines(gatedTest("!RUN_REAL && x", "runFabric(REAL, []);"))).toEqual([2]);
    expect(lines(gatedTest("RUN_REAL || x", "runFabric(REAL, []);"))).toEqual([2]);
    expect(lines(gatedTest("other", "runFabric(REAL, []);"))).toEqual([2]);
    expect(lines(`${IMPORT}runFabric(REAL, []);`)).toEqual([2]);
    expect(lines(`${IMPORT}const bin = REAL;\nrunFabric(bin, []);`)).toEqual([2, 3]);
    expect(lines(`${IMPORT}const fabricPath = REAL;\nvoid ({ fabricPath });`)).toEqual([2, 3]);
    expect(lines(`${IMPORT}fake.prefs.fabricPath = REAL;`)).toEqual([2]);
    expect(lines(`${IMPORT}spawn(\`\${REAL}\`, []);`)).toEqual([2]);
    expect(lines('import { REAL as R2 } from "./real-fabric.ts";\nrunner.runFabric(R2, []);')).toEqual([2]);
    expect(lines('import * as rf from "./real-fabric";\nrunFabric(rf.REAL, []);')).toEqual([2]);
    expect(lines('fake.prefs.fabricPath = "/opt/homebrew/bin/fabric-ai";')).toEqual([1]);
    expect(lines('runner.runFabric("/usr/local/bin/fabric", []);')).toEqual([1]);
    expect(lines("spawnSync(DEFAULT_FABRIC_PATH, []);")).toEqual([1]);
    expect(lines("void ({ fabricPath: DEFAULT_FABRIC_PATH });")).toEqual([1]);
    expect(lines(`${IMPORT}const v = <ResultView fabricPath={REAL} />;`, "t.tsx")).toEqual([2]);
    expect(lines('const v = <ResultView fabricPath={"/opt/homebrew/bin/fabric"} />;', "t.tsx")).toEqual([1]);
    // Data, not a process: comparing the strings is fine.
    expect(lines('expect(shellCommand("/opt/homebrew/bin/fabric", [])).toBe("x");')).toEqual([]);
    expect(lines('expect(DEFAULT_FABRIC_PATH).toBe("/opt/homebrew/bin/fabric-ai");')).toEqual([]);
  });

  test("every use of real fabric in the test files is gated by skipIf(!RUN_REAL)", () => {
    const root = import.meta.dir;
    const files = readdirSync(root, { recursive: true, encoding: "utf8" }).filter((f) => /\.tsx?$/.test(f));
    expect(files.length).toBeGreaterThan(10); // the walk really found the test files
    let uses = 0;
    const ungated: string[] = [];
    for (const f of files.filter((f) => f !== "real-fabric.ts")) {
      const r = realUses(readFileSync(join(root, f), "utf8"), f);
      uses += r.uses;
      ungated.push(...r.ungated.map((l) => `${f}:${l}`));
    }
    // Positive control: ISC-16 and ISC-19 run it (and ISC-1, in runner.test.ts), so a clean result means something.
    expect(uses).toBeGreaterThanOrEqual(2);
    expect(ungated).toEqual([]);
  });
});

// A dry run: fabric builds every step's prompt and calls no model.
test.skipIf(!RUN_REAL)("ISC-78.1: real fabric runs the golden workflow end to end on a dry run", () => {
  const r = spawnSync(REAL, [`--workflow=${join(import.meta.dir, "fixtures", "workflow-golden.json")}`, "--dry-run"], {
    input: "hello probe",
    encoding: "utf8",
  });
  expect(r.stderr).toContain("[step 3/3 create_5_sentence_summary] done");
  expect(r.status).toBe(0);
});
