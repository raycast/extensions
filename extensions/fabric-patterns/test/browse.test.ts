import { afterAll, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";
import {
  actionsFor,
  canPin,
  type ItemType,
  newMenuOrder,
  type NewType,
  type SearchActionId,
  searchActionsFor,
} from "../lib/actions";
import { PathError, writeNewFile } from "../lib/paths";
import { deletePattern, duplicatePattern, listMyPatterns, savePattern, visibility } from "../lib/writers";

const tmp = realpathSync(mkdtempSync(join(tmpdir(), "fabric-browse-")));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

let n = 0;
function tree() {
  const base = join(tmp, `t${++n}`);
  const patterns = join(base, "patterns");
  const mine = join(base, "custom");
  mkdirSync(join(patterns, "summarize"), { recursive: true });
  writeFileSync(join(patterns, "summarize", "system.md"), "# IDENTITY\nSummarize.");
  writeFileSync(join(patterns, "summarize", "user.md"), "user part");
  mkdirSync(mine);
  return { base, patterns, mine };
}
const snapshot = (dir: string) => JSON.stringify(readdirSync(dir, { recursive: true }).sort());

describe("ISC-30 / 30.1: built-ins offer View, Run, Duplicate; own items add Edit, Open, Delete", () => {
  test("built-in pattern: exactly View/Run/Duplicate", () => {
    expect(actionsFor("pattern", false).map((a) => a.id)).toEqual(["view", "run", "duplicate"]);
  });

  test("own pattern adds Edit, Open in Editor and Delete", () => {
    expect(actionsFor("pattern", true).map((a) => a.id)).toEqual([
      "view",
      "run",
      "duplicate",
      "edit",
      "open",
      "delete",
    ]);
  });

  test("a chain (own file in the workflows folder): View, Run, Edit, Open, Delete", () => {
    expect(actionsFor("workflow", true).map((a) => a.id)).toEqual(["view", "run", "edit", "open", "delete"]);
  });

  test("a refused chain: only Edit, Open, Delete (nothing that shows or sends it)", () => {
    expect(actionsFor("workflow", true, true).map((a) => a.id)).toEqual(["edit", "open", "delete"]);
  });
});

describe("ISC-37: every Delete asks first", () => {
  test("delete is the only destructive action, on every type, and it is always flagged", () => {
    for (const t of ["pattern", "strategy", "context", "session", "profile", "workflow"] as ItemType[])
      for (const own of [true, false])
        for (const a of actionsFor(t, own)) expect([t, a.id, a.destructive]).toEqual([t, a.id, a.id === "delete"]);
  });

  // A call-site check over every src/*.tsx: the destructive primitives (deletes, and stopRun,
  // which throws away a run's partial answer) run only inside a named function, and that
  // function is only ever called, inside an `if`, after an `await confirmAlert(` in the same
  // handler. A destructive action that skips the alert (calling the function or a primitive
  // directly) fails here.
  test("destructive primitives run only in a function called after confirmAlert, in every src/*.tsx", () => {
    const PRIMITIVES = ["deletePattern", "deleteOwnFile", "rmSync", "stopRun"];
    const srcDir = join(import.meta.dir, "..", "src");
    const files = readdirSync(srcDir).filter((f) => f.endsWith(".tsx"));
    const problems: string[] = [];
    let primitiveCalls = 0;
    let guardedCalls = 0;
    const guarded: string[] = []; // file:function for every destructive function the scan found

    const walk = (n: ts.Node, f: (n: ts.Node) => void) => {
      f(n);
      n.forEachChild((c) => walk(c, f));
    };
    const enclosingFn = (n: ts.Node): ts.SignatureDeclaration | undefined => {
      for (let p = n.parent; p; p = p.parent) if (ts.isFunctionLike(p)) return p;
      return undefined;
    };
    const calleeName = (c: ts.CallExpression) =>
      ts.isIdentifier(c.expression)
        ? c.expression.text
        : ts.isPropertyAccessExpression(c.expression)
          ? c.expression.name.text
          : undefined;

    expect(files.length).toBeGreaterThan(1);
    for (const file of files) {
      const sf = ts.createSourceFile(
        file,
        readFileSync(join(srcDir, file), "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      const where = (n: ts.Node) => `${file}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;

      // An aliased import (`deletePattern as dp`) is a primitive too.
      const primitives = new Set(PRIMITIVES);
      walk(sf, (n) => {
        if (ts.isImportSpecifier(n) && PRIMITIVES.includes((n.propertyName ?? n.name).text))
          primitives.add(n.name.text);
      });

      // 1. Every primitive call sits directly in a named function declaration: the delete function.
      const deleteFns = new Set<string>();
      walk(sf, (n) => {
        if (!ts.isCallExpression(n) || !primitives.has(calleeName(n) ?? "")) return;
        primitiveCalls++;
        const fn = enclosingFn(n);
        if (fn && ts.isFunctionDeclaration(fn) && fn.name) deleteFns.add(fn.name.text);
        else problems.push(`${where(n)}: ${calleeName(n)}() outside a named delete function`);
      });

      // 2. A delete function is never exported or passed around; every call to it is decided by
      //    an awaited confirmAlert() answer in the same handler.
      for (const name of deleteFns) {
        guarded.push(`${file}:${name}`);
        let uses = 0;
        walk(sf, (n) => {
          if (!ts.isIdentifier(n) || n.text !== name) return;
          const parent = n.parent;
          if (ts.isFunctionDeclaration(parent) && parent.name === n) {
            if (parent.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
              problems.push(`${where(n)}: delete function ${name} is exported`);
            return;
          }
          uses++;
          if (!ts.isCallExpression(parent) || parent.expression !== n) {
            problems.push(`${where(n)}: ${name} is referenced without being called`);
            return;
          }
          // The answer must decide the call: `const ok = await confirmAlert(…)` earlier in the same
          // handler, and the call in the then-branch of `if (ok)`. An inverted (`!ok`), widened
          // (`ok || x`) or ignored answer fails.
          const handler = enclosingFn(parent);
          const answers = new Set<string>();
          if (handler && ts.isFunctionDeclaration(handler) && handler.body)
            walk(handler.body, (m) => {
              if (
                ts.isVariableDeclaration(m) &&
                ts.isIdentifier(m.name) &&
                ts.isVariableDeclarationList(m.parent) &&
                m.parent.flags & ts.NodeFlags.Const &&
                m.initializer &&
                ts.isAwaitExpression(m.initializer) &&
                ts.isCallExpression(m.initializer.expression) &&
                calleeName(m.initializer.expression) === "confirmAlert" &&
                enclosingFn(m) === handler &&
                m.getStart() < parent.getStart()
              )
                answers.add(m.name.text);
            });
          let decided = false;
          for (let c: ts.Node = parent; handler && c.parent && c !== handler; c = c.parent) {
            const p = c.parent;
            if (ts.isIfStatement(p) && p.thenStatement === c && ts.isIdentifier(p.expression))
              decided ||= answers.has(p.expression.text);
          }
          if (!decided) problems.push(`${where(n)}: ${name}() is not decided by an awaited confirmAlert() answer`);
          else guardedCalls++;
        });
        if (!uses) problems.push(`${file}: delete function ${name} is never called`);
      }
    }

    expect(problems).toEqual([]);
    expect(primitiveCalls).toBeGreaterThan(0); // the scan really found the delete calls
    expect(guardedCalls).toBeGreaterThan(0);
    // Pinned apart from PRIMITIVES: dropping one from that list, or renaming its call in src, shows here.
    expect(guarded.sort()).toEqual(["background-runs.tsx:stop", "browse.tsx:remove"]);
  });
});

describe("ISC-31: Duplicate writes <name>_copy into My patterns", () => {
  test("copies system.md and user.md; a second copy becomes _copy2", () => {
    const t = tree();
    expect(duplicatePattern(join(t.patterns, "summarize"), t.mine, "summarize", t.patterns)).toBe("summarize_copy");
    expect(duplicatePattern(join(t.patterns, "summarize"), t.mine, "summarize", t.patterns)).toBe("summarize_copy2");
    expect(readFileSync(join(t.mine, "summarize_copy", "system.md"), "utf8")).toBe("# IDENTITY\nSummarize.");
    expect(readFileSync(join(t.mine, "summarize_copy", "user.md"), "utf8")).toBe("user part");
    expect(listMyPatterns(t.mine)).toEqual(["summarize_copy", "summarize_copy2"]);
  });
});

describe("ISC-32: a saved pattern fabric can't see is flagged", () => {
  test("visibility", () => {
    expect(visibility("mine", ["summarize", "mine"])).toBe("visible");
    expect(visibility("mine", ["summarize"])).toBe("invisible");
  });
});

describe("own-pattern edits", () => {
  test("save, rename (refusing an existing target), delete", () => {
    const t = tree();
    savePattern(t.mine, t.patterns, { name: "alpha", system: "A" });
    expect(() => savePattern(t.mine, t.patterns, { name: "alpha", system: "again" })).toThrow();
    savePattern(t.mine, t.patterns, { name: "alpha", system: "A2", user: "U", previousName: "alpha" });
    expect(readFileSync(join(t.mine, "alpha", "system.md"), "utf8")).toBe("A2");
    savePattern(t.mine, t.patterns, { name: "beta", system: "B" });
    expect(() => savePattern(t.mine, t.patterns, { name: "beta", system: "x", previousName: "alpha" })).toThrow(
      /already exists/,
    );
    savePattern(t.mine, t.patterns, { name: "gamma", system: "A3", user: "U", previousName: "alpha" });
    expect(existsSync(join(t.mine, "alpha"))).toBe(false);
    expect(readFileSync(join(t.mine, "gamma", "user.md"), "utf8")).toBe("U");
    deletePattern(t.mine, "gamma", t.patterns);
    expect(listMyPatterns(t.mine)).toEqual(["beta"]);
  });
});

describe("ISC-8 / 8.1: no write ever lands under fabric's patterns folder", () => {
  test("My patterns pointed at the built-ins (directly, by symlink, by ../, by case) is refused for every writer", () => {
    const t = tree();
    const before = snapshot(t.patterns);
    const link = join(t.base, "link");
    symlinkSync(t.patterns, link);
    const tricks = [
      t.patterns,
      join(t.patterns, "summarize"),
      link,
      join(t.mine, "..", "patterns"),
      t.patterns.replace("/patterns", "/PATTERNS"),
    ];
    for (const dir of tricks) {
      expect(() => duplicatePattern(join(t.patterns, "summarize"), dir, "summarize", t.patterns)).toThrow(PathError);
      expect(() => savePattern(dir, t.patterns, { name: "evil", system: "x" })).toThrow(PathError);
      expect(() => savePattern(dir, t.patterns, { name: "summarize", system: "x", previousName: "summarize" })).toThrow(
        PathError,
      );
      expect(() => deletePattern(dir, "summarize", t.patterns)).toThrow(PathError);
    }
    expect(snapshot(t.patterns)).toBe(before);
    expect(readFileSync(join(t.patterns, "summarize", "system.md"), "utf8")).toBe("# IDENTITY\nSummarize.");
  });

  test("a symlinked pattern inside My patterns is never written through or deleted", () => {
    const t = tree();
    symlinkSync(join(t.patterns, "summarize"), join(t.mine, "sneaky"));
    expect(() => savePattern(t.mine, t.patterns, { name: "sneaky", system: "x", previousName: "sneaky" })).toThrow(
      PathError,
    );
    expect(() => deletePattern(t.mine, "sneaky", t.patterns)).toThrow(PathError);
    expect(readFileSync(join(t.patterns, "summarize", "system.md"), "utf8")).toBe("# IDENTITY\nSummarize.");
  });

  test("My patterns set to the patterns folder's PARENT can't save over or delete `patterns` itself", () => {
    const t = tree();
    const before = snapshot(t.patterns);
    expect(listMyPatterns(t.base)).toContain("patterns");
    expect(() => savePattern(t.base, t.patterns, { name: "patterns", system: "x", previousName: "patterns" })).toThrow(
      PathError,
    );
    expect(() => deletePattern(t.base, "patterns", t.patterns)).toThrow(PathError);
    expect(() => deletePattern(t.base, "PATTERNS", t.patterns)).toThrow(PathError);
    expect(snapshot(t.patterns)).toBe(before);
  });

  test("a refused folder is never created: no stray dirs appear under patterns/", () => {
    const t = tree();
    const before = snapshot(t.patterns);
    const deep = join(t.patterns, "out", "deeper");
    expect(() => savePattern(deep, t.patterns, { name: "evil", system: "x" })).toThrow(PathError);
    expect(() => writeNewFile(deep, "a.md", "x", t.patterns)).toThrow(PathError);
    const link = join(t.base, "plink");
    symlinkSync(t.patterns, link);
    expect(() => writeNewFile(join(link, "via-link"), "a.md", "x", t.patterns)).toThrow(PathError);
    expect(existsSync(join(t.patterns, "out"))).toBe(false);
    expect(existsSync(join(t.patterns, "via-link"))).toBe(false);
    expect(snapshot(t.patterns)).toBe(before);
  });

  test("link/../x is refused before mkdir: the kernel would resolve the link first and land in patterns/", () => {
    const t = tree();
    mkdirSync(join(t.patterns, "sub"));
    const before = snapshot(t.patterns);
    const l = join(t.base, "lsub");
    symlinkSync(join(t.patterns, "sub"), l);
    expect(() => writeNewFile(`${l}/../stray`, "a.md", "x", t.patterns)).toThrow(/\.\. segments/);
    expect(existsSync(join(t.patterns, "stray"))).toBe(false);
    expect(snapshot(t.patterns)).toBe(before);
  });

  test("a protected root that doesn't exist yet, behind a symlinked ancestor, is still protected", () => {
    const t = tree();
    const realCfg = join(t.base, "dotfiles-config");
    mkdirSync(realCfg);
    const cfgLink = join(t.base, "cfg");
    symlinkSync(realCfg, cfgLink);
    const root = join(cfgLink, "fabric", "patterns"); // not created yet
    expect(() => writeNewFile(join(realCfg, "fabric", "patterns", "mine"), "a.md", "x", root)).toThrow(PathError);
    expect(existsSync(join(realCfg, "fabric"))).toBe(false);
  });

  test("names with ../ or a slash are refused", () => {
    const t = tree();
    for (const bad of ["../patterns/summarize", "a/b", "..", ".hidden"])
      expect(() => savePattern(t.mine, t.patterns, { name: bad, system: "x" })).toThrow(PathError);
  });
});

describe("ISC-37: the session view's Delete also confirms", () => {
  test("ViewSession's destructive action awaits onDelete and closes only on a delete; Browse passes confirmDelete", () => {
    const { sf, nodes } = parse("editors.tsx");
    const destructive = nodes.filter(
      (n): n is ts.JsxSelfClosingElement =>
        ts.isJsxSelfClosingElement(n) &&
        n.attributes.properties.some(
          (a) => ts.isJsxAttribute(a) && a.initializer?.getText(sf) === "{Action.Style.Destructive}",
        ),
    );
    expect(destructive.length).toBeGreaterThan(0);
    for (const el of destructive) {
      const onAction = el.attributes.properties.find(
        (a): a is ts.JsxAttribute => ts.isJsxAttribute(a) && a.name.getText(sf) === "onAction",
      );
      const fn = onAction?.initializer && ts.isJsxExpression(onAction.initializer) && onAction.initializer.expression;
      const ifs = fn ? within(nodes, fn).filter(ts.isIfStatement) : [];
      // `if (await onDelete(name)) pop();`: deletes only through onDelete (Browse's confirmDelete),
      // and closes only when that resolved true, so a cancelled alert keeps the view open.
      expect(
        ifs.map(
          (i) => `${i.expression.getText(sf)} → ${i.thenStatement.getText(sf)}; else ${i.elseStatement?.getText(sf)}`,
        ),
      ).toEqual(["await onDelete(name) → pop();; else undefined"]);
    }
    const browse = readFileSync(join(import.meta.dir, "..", "src", "browse.tsx"), "utf8");
    expect(browse).toMatch(/onDelete=\{\(name\) => confirmDelete\(renamedTo\(name\)\)\}/);
  });

  test("confirmDelete resolves true only for a delete that happened", () => {
    const { sf, nodes } = parse("browse.tsx");
    const returnsOf = (name: string) => {
      const fn = nodes.find((n): n is ts.FunctionDeclaration => ts.isFunctionDeclaration(n) && n.name?.text === name);
      if (!fn) return [`${name} not found`];
      return within(nodes, fn)
        .filter((n): n is ts.ReturnStatement => ts.isReturnStatement(n) && enclosingFn(n) === fn)
        .map((r) => {
          let inCatch = false;
          for (let p = r.parent; p && p !== fn; p = p.parent) if (ts.isCatchClause(p)) inCatch = true;
          return `${inCatch ? "catch: " : ""}${r.expression?.getText(sf) ?? "(nothing)"}`;
        });
    };
    // Cancelled → false (the view stays); confirmed → whatever the delete reports.
    expect(returnsOf("confirmDelete")).toEqual(["remove(it)", "false"]);
    // A failed delete → false; every path that deleted the file → true.
    expect(returnsOf("remove")).toEqual(["catch: false", "true", "true"]);
  });
});

// The Result view says "Stopped" only from the run's done callback, never from the Stop action itself.
describe("Result says Stopped only once the run has exited", () => {
  test('the only "Stopped" toast in src/result.tsx sits inside h.done.then(…), under status === "stopped"', () => {
    const { sf, nodes } = parse("result.tsx");
    const where = nodes
      .filter(ts.isPropertyAssignment)
      .filter(
        (n) => n.name.getText(sf) === "title" && ts.isStringLiteral(n.initializer) && n.initializer.text === "Stopped",
      )
      .map((n) => {
        let branch: string | undefined; // the condition of the nearest `if` whose then-branch holds the toast
        for (let c: ts.Node = n; c.parent; c = c.parent) {
          const p = c.parent;
          if (!branch && ts.isIfStatement(p) && p.thenStatement === c) branch = p.expression.getText(sf);
          if (
            ts.isCallExpression(p) &&
            ts.isPropertyAccessExpression(p.expression) &&
            p.expression.name.text === "then" &&
            p.expression.expression.getText(sf) === "h.done"
          )
            return `in done, if ${branch}`;
        }
        return `line ${lineOf(sf, n)}`;
      });
    expect(where).toEqual(['in done, if status === "stopped"']);
  });
});

// Raycast binds ↵ to a panel's first action and ⌘↵ to its second, whatever shortcut that one sets.
describe("⌘↵ never toggles a pin or destroys anything", () => {
  test("Search: ↵ runs or continues, ⌘↵ is Configure Run or Copy Name", () => {
    expect(searchActionsFor("pattern")).toEqual(["run", "configure", "pin", "copyName"]);
    expect(searchActionsFor("session")).toEqual(["continue", "copyName", "pin"]);
    expect(searchActionsFor("workflow")).toEqual(["run", "configure", "pin", "copyName"]);
  });

  test("neither Search's nor Browse's table puts Pin or Delete in the first two slots", () => {
    const types: ItemType[] = ["pattern", "strategy", "context", "session", "profile", "workflow"];
    const slots: [string, string[]][] = [
      ...(["pattern", "session", "workflow"] as const).map((k): [string, string[]] => [
        `search ${k}`,
        searchActionsFor(k),
      ]),
      ...types.flatMap((t) =>
        [false, true].map((own): [string, string[]] => [`browse ${t} own=${own}`, actionsFor(t, own).map((a) => a.id)]),
      ),
    ];
    for (const [where, ids] of slots)
      expect([where, ids.slice(0, 2).filter((id) => id === "pin" || id === "delete")]).toEqual([where, []]);
  });

  // The table only protects ⌘↵ if the view renders from it, and each id renders its own action.
  test("Search's row panel renders from searchActionsFor, and each id is the action it names", () => {
    const { sf, nodes } = parse("search.tsx");
    const row = nodes.find(
      (n): n is ts.JsxElement =>
        ts.isJsxElement(n) &&
        n.openingElement.tagName.getText(sf) === "ActionPanel" &&
        n.getText(sf).includes("{actions}"),
    );
    expect(row ? "found" : "no ActionPanel renders `actions`").toBe("found");
    const kids = row!.children.filter((c) => !(ts.isJsxText(c) && !c.text.trim()));
    expect(kids.map((k) => k.getText(sf))).toEqual(["{actions}"]);
    const decl = (name: string) =>
      nodes.find((n): n is ts.VariableDeclaration => ts.isVariableDeclaration(n) && n.name.getText(sf) === name);
    const actions = decl("actions");
    expect(actions ? "found" : "no `actions` in search.tsx").toBe("found");
    // One record per kind, inside a map over that kind's table; a shorthand entry is a const.
    const maps = within(nodes, actions!).filter(
      (n): n is ts.CallExpression =>
        ts.isCallExpression(n) && /^searchActionsFor\("\w+"\)\.map$/.test(n.expression.getText(sf)),
    );
    const bodyOf = (o: ts.ObjectLiteralExpression) =>
      Object.fromEntries(
        o.properties.map((p) => [
          p.name!.getText(sf),
          ts.isShorthandPropertyAssignment(p) ? decl(p.name.text)!.initializer!.getText(sf) : p.getText(sf),
        ]),
      );
    const kinds = Object.fromEntries(
      maps.map((m) => {
        const kind = /^searchActionsFor\("(\w+)"\)/.exec(m.expression.getText(sf))![1];
        // The record is the object checked with `satisfies` (not, say, a shortcut's object);
        // Prettier may wrap it in parentheses.
        const outer = (n: ts.Node): ts.Node => (ts.isParenthesizedExpression(n.parent) ? outer(n.parent) : n.parent);
        const records = within(nodes, m).filter(
          (n): n is ts.ObjectLiteralExpression => ts.isObjectLiteralExpression(n) && ts.isSatisfiesExpression(outer(n)),
        );
        expect([kind, records.length]).toEqual([kind, 1]);
        return [kind, bodyOf(records[0])];
      }),
    );
    expect(Object.keys(kinds).sort()).toEqual(["pattern", "session", "workflow"]);
    const marks: Record<SearchActionId, string> = {
      run: "quickRun(e)",
      configure: "configure(e)",
      continue: "continueSession(e.name)",
      pin: "togglePin(e)",
      copyName: 'title="Copy Name"',
    };
    for (const kind of ["pattern", "session", "workflow"] as const) {
      const body = kinds[kind];
      expect([kind, Object.keys(body).sort()]).toEqual([kind, [...searchActionsFor(kind)].sort()]);
      for (const id of searchActionsFor(kind)) {
        expect([kind, id, body[id]?.includes(marks[id])]).toEqual([kind, id, true]);
        // A mark in another entry would mean two ids render the same action.
        const others = Object.entries(body).filter(([k, t]) => k !== id && t.includes(marks[id]));
        expect([kind, id, others.map(([k]) => k)]).toEqual([kind, id, []]);
      }
    }
  });
});

// A run count that fails to save must never stop a run: the views count through countRun,
// which never rejects, and Search's ↵ opens the Result before it counts.
describe("Counting a run never holds up the run", () => {
  test("nothing in src/ but countRun calls store.recordRun", () => {
    const direct = sourceFiles("src", /\.tsx?$/)
      .filter((f) => f !== "storage.ts") // countRun's own home
      .flatMap((f) =>
        callsIn(f)
          .filter((c) => c.callee.endsWith(".recordRun"))
          .map((c) => `${f}: ${c.callee}`),
      );
    expect(direct).toEqual([]);
  });

  test("every countRun counts the row's typed id (a name would never match the ranking)", () => {
    const ids = ["search.tsx", "browse.tsx"].flatMap((f) =>
      callsIn(f)
        .filter((c) => c.callee === "countRun")
        .map((c) => `${f}: ${c.args[1]}, ${c.args[2]}`),
    );
    expect(ids.length).toBe(4); // Search's quick run and Configure Run, Browse's Configure Run for a pattern and a chain
    for (const id of ids) expect(id).toMatch(/: (e|it)\.id, setUsage$/);
  });

  // Where a run goes and when it is counted is tested on startRun itself (test/start-run.test.ts).
  test("only startRun starts a run; Search's ↵ and Configure Run's go each call it once", () => {
    const starters = sourceFiles("src", /\.tsx?$/)
      .filter((f) => f !== "start-run.tsx")
      .flatMap((f) => {
        const { sf, nodes } = parse(f);
        const bg = callsIn(f).filter((c) => c.callee === "runInBackground");
        const views = nodes.filter(
          (n) => (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && n.tagName.getText(sf) === "ResultView",
        );
        return [...bg.map(() => `${f}: runInBackground`), ...views.map(() => `${f}: <ResultView>`)];
      });
    expect(starters).toEqual([]);
    // Each call site still routes by what the user chose: Configure Run's background box, and
    // Search's long-input preference (a `background: false` there would kill runs on close).
    const routing: Record<string, string> = {
      "search.tsx": 'background: isLong(runInput) && p.longInputs === "background"',
      "configure.tsx": "background",
    };
    for (const [file, fn] of [
      ["search.tsx", "quickRun"],
      ["configure.tsx", "go"],
    ]) {
      const { sf, nodes } = parse(file);
      const decl = nodes.find(
        (n) => (ts.isVariableDeclaration(n) || ts.isFunctionDeclaration(n)) && n.name?.getText(sf) === fn,
      );
      expect(decl ? "found" : `${fn} not found in ${file}`).toBe("found");
      const calls = within(nodes, decl!).filter(
        (n) => ts.isCallExpression(n) && n.expression.getText(sf) === "startRun",
      );
      expect(`${file} ${fn}: ${calls.length}`).toBe(`${file} ${fn}: 1`);
      const opts = (calls[0] as ts.CallExpression).arguments[1];
      const bg =
        opts && ts.isObjectLiteralExpression(opts)
          ? opts.properties.find((p) => p.name?.getText(sf) === "background")?.getText(sf)
          : undefined;
      expect(`${file}: ${bg}`).toBe(`${file}: ${routing[file]}`);
    }
  });
});

// ⇧⌘, opens a command's settings in Raycast, so an action bound to it hijacks that (2026-10-19:
// it copied the fabric command, which then got pasted into Preferences as the Save Folder).
describe("no action takes Raycast's settings shortcut", () => {
  test("no shortcut in src uses the , key", () => {
    const files = sourceFiles("src", /\.tsx?$/);
    expect(files).toContain("result.tsx");
    const comma = files.flatMap((file) => {
      const { sf, nodes } = parse(file);
      return (
        nodes
          .filter(ts.isPropertyAssignment)
          // `key`, `"key"`, and "," or `,` alike.
          .filter(
            (n) =>
              (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) &&
              n.name.text === "key" &&
              ts.isStringLiteralLike(n.initializer) &&
              n.initializer.text === ",",
          )
          .map((n) => `${file}:${lineOf(sf, n)}`)
      );
    });
    expect(comma).toEqual([]);
  });
});

// Wiring checks read the TypeScript AST, so a call that is commented out (or sits in a string) doesn't count.
// Parsed once per file: tests only read the tree.
const parsed = new Map<string, { sf: ts.SourceFile; nodes: ts.Node[] }>();
function parse(file: string, dir = "src") {
  const key = `${dir}/${file}`;
  const hit = parsed.get(key);
  if (hit) return hit;
  const sf = ts.createSourceFile(
    file,
    readFileSync(join(import.meta.dir, "..", dir, file), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const nodes: ts.Node[] = [];
  const visit = (n: ts.Node) => {
    nodes.push(n);
    n.forEachChild(visit);
  };
  visit(sf);
  parsed.set(key, { sf, nodes });
  return { sf, nodes };
}

/** The .ts/.tsx files of a source folder (by default .tsx only, the views). */
const sourceFiles = (dir: string, re = /\.tsx$/) =>
  readdirSync(join(import.meta.dir, "..", dir)).filter((f) => re.test(f));

/** The nodes inside `outer`, from parse()'s flat list. */
const within = (nodes: ts.Node[], outer: ts.Node) =>
  nodes.filter((n) => n.getStart() >= outer.getStart() && n.getEnd() <= outer.getEnd());

/** The nearest function around a node, so a nested callback's statements aren't its parent's. */
const enclosingFn = (n: ts.Node) => {
  for (let p = n.parent; p; p = p.parent) if (ts.isFunctionLike(p)) return p;
  return undefined;
};

const lineOf = (sf: ts.SourceFile, n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;

/** Every real call in a src file: callee and argument text, whether it is awaited, and the named function around it. */
function callsIn(file: string) {
  const { sf, nodes } = parse(file);
  return nodes.filter(ts.isCallExpression).map((c) => {
    let fn: string | undefined;
    for (let p = c.parent; p && !fn; p = p.parent) if (ts.isFunctionDeclaration(p)) fn = p.name?.text;
    return {
      callee: c.expression.getText(sf),
      args: c.arguments.map((a) => a.getText(sf)),
      awaited: ts.isAwaitExpression(c.parent),
      fn,
    };
  });
}

describe("a rename keeps its pin, and Open in Editor opens a text editor", () => {
  test("every editor that can rename moves the pin", () => {
    const moves = (file: string) =>
      callsIn(file)
        .filter((c) => c.callee === "movePin" && c.awaited && c.args[1] === "name" && c.args[2] === "newName.trim()")
        .map((c) => c.args[0]);
    expect(moves("editors.tsx").sort()).toEqual(['"context"', '"profile"', '"session"', '"strategy"']);
    expect(moves("edit-pattern.tsx")).toEqual(['"pattern"']);
  });

  test("no Open in Editor hands the file to its extension's default app", () => {
    const files = readdirSync(join(import.meta.dir, "..", "src")).filter((f) => f.endsWith(".tsx"));
    for (const f of files) {
      const { sf, nodes } = parse(f);
      const opens = nodes.filter(
        (n): n is ts.JsxSelfClosingElement | ts.JsxOpeningElement =>
          (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText(sf) === "Action.Open",
      );
      for (const o of opens) expect([f, o.attributes.getText(sf).includes("Open in Editor")]).toEqual([f, false]);
    }
    const calls = callsIn("open-in-editor.tsx");
    expect(calls.filter((c) => c.callee === "openInEditorArgv").map((c) => c.args)).toEqual([["target"]]);
    expect(calls.filter((c) => c.callee === "execFile").map((c) => c.args.slice(0, 2))).toEqual([["cmd", "args"]]);
  });

  test("the paste fallback's notification goes out through notifyArgv", () => {
    const calls = callsIn("deliver.ts");
    expect(calls.filter((c) => c.callee === "notifyArgv").map((c) => c.args)).toEqual([["text"]]);
    expect(calls.filter((c) => c.callee === "execFile").map((c) => c.args.slice(0, 2))).toEqual([["cmd", "args"]]);
  });
});

// ISC-2 by structure, not spelling: calls are matched through what each file imports from
// child_process (named, renamed or namespace), so `cp.exec`, `exec as sh` or options held in a
// variable can't slip past. Any other way to start a process fails outright.
describe("ISC-2: no process call in src/ or lib/ can reach a shell", () => {
  const SPAWNERS = new Set(["spawn", "spawnSync", "execFile", "execFileSync", "exec", "execSync"]);
  const isChildProcess = (s: ts.Expression) => ts.isStringLiteral(s) && /^(node:)?child_process$/.test(s.text);
  const sources = (["src", "lib"] as const).flatMap((dir) =>
    sourceFiles(dir, /\.tsx?$/).map((f) => ({ dir, f, ...parse(f, dir) })),
  );

  const scan = sources.map(({ dir, f, sf, nodes }) => {
    const where = (n: ts.Node) => `${dir}/${f}:${lineOf(sf, n)}`;
    const named = new Map<string, string>(); // local name → child_process export
    const namespaces = new Set<string>();
    const refused: string[] = [];
    for (const n of nodes) {
      if (ts.isImportDeclaration(n) && isChildProcess(n.moduleSpecifier)) {
        const b = n.importClause?.namedBindings;
        if (n.importClause?.name) namespaces.add(n.importClause.name.text);
        if (b && ts.isNamespaceImport(b)) namespaces.add(b.name.text);
        if (b && ts.isNamedImports(b))
          for (const s of b.elements) named.set(s.name.text, (s.propertyName ?? s.name).text);
      }
      if (ts.isCallExpression(n)) {
        const callee = n.expression.getText(sf);
        if (callee === "require" && n.arguments[0] && isChildProcess(n.arguments[0]))
          refused.push(`${where(n)}: require("child_process")`);
        if (/^Bun\.(spawn|spawnSync|\$)$/.test(callee)) refused.push(`${where(n)}: ${callee}`);
      }
      if (ts.isTaggedTemplateExpression(n) && /^(Bun\.)?\$$/.test(n.tag.getText(sf)))
        refused.push(`${where(n)}: Bun shell`);
    }
    // `const run = promisify(execFile)` is execFile too.
    for (const n of nodes)
      if (
        ts.isVariableDeclaration(n) &&
        ts.isIdentifier(n.name) &&
        n.initializer &&
        ts.isCallExpression(n.initializer)
      ) {
        const [inner] = n.initializer.arguments;
        if (n.initializer.expression.getText(sf) === "promisify" && inner && ts.isIdentifier(inner)) {
          const of = named.get(inner.text);
          if (of) named.set(n.name.text, of);
        }
      }
    const resolve = (e: ts.Expression) => {
      if (ts.isIdentifier(e)) return named.get(e.text);
      if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && namespaces.has(e.expression.text))
        return e.name.text;
      return undefined;
    };
    const calls = nodes
      .filter((n): n is ts.CallExpression => ts.isCallExpression(n))
      .map((c) => ({ c, fn: resolve(c.expression), at: where(c), sf }))
      .filter((x): x is typeof x & { fn: string } => !!x.fn && SPAWNERS.has(x.fn));
    return { calls, refused };
  });
  const spawnCalls = scan.flatMap((s) => s.calls);

  test("the sweep finds the spawn calls it polices", () => {
    expect(spawnCalls.length).toBe(6); // runner, background x3 (spawn, execFileSync, run), deliver, open-in-editor
  });

  test("no other way to start a process: no require, Bun.spawn or Bun shell", () => {
    expect(scan.flatMap((s) => s.refused)).toEqual([]);
  });

  test("never exec/execSync; options are an object literal without `shell` or a spread", () => {
    const bad = spawnCalls.flatMap(({ at, c, fn, sf }) => {
      const out: string[] = [];
      if (fn === "exec" || fn === "execSync") out.push(`${at}: ${fn} runs a shell`);
      for (const a of c.arguments.slice(2)) {
        if (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) continue; // a callback
        if (!ts.isObjectLiteralExpression(a)) {
          out.push(`${at}: options passed as ${a.getText(sf)}, which this check can't read`);
          continue;
        }
        for (const p of a.properties)
          if (p.name?.getText(sf) === "shell" || ts.isSpreadAssignment(p))
            out.push(`${at}: options set ${p.getText(sf)}`);
      }
      return out;
    });
    expect(bad).toEqual([]);
  });

  test("a callback execFile takes exactly (file, args, callback)", () => {
    const shape = spawnCalls
      .filter(({ fn, c }) => fn === "execFile" && c.expression.getText(c.getSourceFile()) !== "run")
      .map(({ at, c }) => {
        const last = c.arguments[c.arguments.length - 1];
        const fnLast = !!last && (ts.isArrowFunction(last) || ts.isFunctionExpression(last));
        return `${at}: ${c.arguments.length} args, callback last ${fnLast}`;
      });
    expect(shape.length).toBe(2);
    for (const s of shape) expect(s).toMatch(/: 3 args, callback last true$/);
  });
});

describe("deleting a pinned item unpins it", () => {
  test("Browse's remove forgets the deleted item's pin, run count and pinned model", () => {
    const forgets = callsIn("browse.tsx").filter((c) => c.callee === "forgetItem");
    expect(forgets.map((c) => [c.fn, c.args, c.awaited])).toEqual([["remove", ["store", "it.type", "it.name"], true]]);
    // forgetItem itself is driven end to end in models-ui.test.ts (ISC-60.2).
  });
});

describe("Manage Fabric's New menu and pins", () => {
  test.each<[Parameters<typeof newMenuOrder>[0], NewType[]]>([
    ["pattern", ["pattern", "strategy", "context", "profile", "workflow"]],
    ["mine", ["pattern", "strategy", "context", "profile", "workflow"]],
    ["strategy", ["strategy", "pattern", "context", "profile", "workflow"]],
    ["context", ["context", "pattern", "strategy", "profile", "workflow"]],
    ["profile", ["profile", "pattern", "strategy", "context", "workflow"]],
    ["workflow", ["workflow", "pattern", "strategy", "context", "profile"]],
    // Sessions are made by runs, not by New, so the order is unchanged.
    ["session", ["pattern", "strategy", "context", "profile", "workflow"]],
  ])("browsing %s, New lists %p", (view, order) => {
    expect(newMenuOrder(view)).toEqual(order);
  });

  test("patterns, sessions and chains can be pinned (Run Fabric Pattern lists them); nothing else can", () => {
    const all: ItemType[] = ["pattern", "strategy", "context", "session", "profile", "workflow"];
    expect(all.filter(canPin)).toEqual(["pattern", "session", "workflow"]);
  });
});
