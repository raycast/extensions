/**
 * The shared behaviour table, run through the extension's wiring.
 *
 * fixtures/test-cases.json is ide/test-cases.json, which the CLI, the VS Code
 * extension and the IntelliJ plugin are already held to. Running it here
 * through runUtility (not runLocal directly) checks the part this extension
 * adds: that a Raycast run reaches the same implementation with the same
 * options, and reports a refusal as a UtilityError the view can show.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runUtility, UtilityError, UTILITIES, exampleFor, type Options } from "../src/lib/utilities";

type Case = {
  name: string;
  input: string;
  options?: Options;
  expect?: string;
  contains?: string;
  matches?: string;
  matchesNot?: string;
  throws?: string;
  maxLineLength?: number;
  joinedEquals?: string;
  sameMultisetAs?: string;
  differsFrom?: { input: string; options?: Options };
};

const raw = JSON.parse(readFileSync(resolve(__dirname, "fixtures/test-cases.json"), "utf8")) as Record<string, unknown>;
const cases = Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith("_"))) as Record<string, Case[]>;
const offered = new Set(UTILITIES.map((u) => u.id));

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

describe("shared behaviour cases", () => {
  it("has cases for every utility the extension offers", () => {
    const missing = UTILITIES.filter((u) => !cases[u.id]?.length).map((u) => u.id);
    expect(missing).toEqual([]);
  });

  for (const [toolId, list] of Object.entries(cases)) {
    if (!offered.has(toolId)) continue;
    describe(toolId, () => {
      for (const c of list) {
        it(c.name, () => {
          const run = () => runUtility(toolId, c.input, c.options ?? {});

          if (c.throws !== undefined) {
            expect(run).toThrow(UtilityError);
            if (c.throws) expect(run).toThrow(new RegExp(escapeRe(c.throws), "i"));
            return;
          }

          const out = run();
          if (c.expect !== undefined) expect(out).toBe(c.expect);
          if (c.contains !== undefined) expect(out).toContain(c.contains);
          if (c.matches !== undefined) expect(out).toMatch(new RegExp(c.matches));
          if (c.matchesNot !== undefined) expect(out).not.toMatch(new RegExp(c.matchesNot));
          if (c.maxLineLength !== undefined) {
            const max = c.maxLineLength;
            expect(out.split("\n").every((l) => l.length <= max)).toBe(true);
          }
          if (c.joinedEquals !== undefined) expect(out.replace(/\n/g, " ")).toBe(c.joinedEquals);
          if (c.sameMultisetAs !== undefined)
            expect(out.split("\n").sort()).toEqual(c.sameMultisetAs.split("\n").sort());
          if (c.differsFrom !== undefined) {
            expect(out).not.toBe(runUtility(toolId, c.differsFrom.input, c.differsFrom.options ?? {}));
          }
        });
      }
    });
  }
});

/*
 * Try the Example runs the CLI's recorded example input for each utility. The
 * recorded answers were captured from the redbison.dev server, and 19 of the
 * local implementations print the same facts in their own text layout
 * (date-diff gives "Total days: 358" where the server gives JSON), so the
 * answer itself is pinned by the case table above; here the example has to
 * run cleanly and say something.
 */
describe("CLI examples", () => {
  for (const u of UTILITIES) {
    const ex = exampleFor(u.id);
    if (!ex) continue;
    it(`${u.id} runs its example`, () => {
      const out = runUtility(u.id, u.generates ? "" : ex.input, ex.options);
      expect(out.trim().length).toBeGreaterThan(0);
    });
  }

  it("has an example for most utilities", () => {
    const without = UTILITIES.filter((u) => !exampleFor(u.id)).map((u) => u.id);
    expect(without.length).toBeLessThan(UTILITIES.length / 10);
  });
});
