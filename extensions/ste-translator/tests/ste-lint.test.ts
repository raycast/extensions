import { describe, expect, it } from "vitest";
import { hardFindings, lintText } from "../src/services/ste-lint";

const rules = (text: string) => lintText(text).findings.map((f) => f.rule);
const has = (text: string, rule: string) => rules(text).includes(rule);
const twenty = Array(20).fill("word").join(" ");

describe("rule detection", () => {
  it("flags each structural rule", () => {
    const found = new Set(
      rules(
        "The panel is removed; spin up the job. Perform an analysis of the seamless log. We have received the report.",
      ),
    );
    for (const expected of [
      "semicolon",
      "phrasal-verb",
      "nominalization",
      "marketing-adjective",
      "passive-voice",
      "present-perfect",
    ]) {
      expect(found).toContain(expected);
    }
  });

  it("never flags hedges or modal perfects", () => {
    expect(
      lintText("The request may have failed. It could be a timeout. The disk might have filled.").findings,
    ).toEqual([]);
    for (const modal of ["may", "might", "could", "should", "would", "must"]) {
      for (const gap of [" ", "  ", "\t", " not "]) {
        expect(has(`The task ${modal}${gap}have run.`, "present-perfect")).toBe(false);
      }
    }
    expect(has("The task couldn't have run. The task MAY NOT HAVE RUN.", "present-perfect")).toBe(false);
  });

  it("flags irregular participles in compound tenses", () => {
    const n = rules("The task has run. The job has set the flag. We have begun.").filter(
      (r) => r === "present-perfect",
    );
    expect(n).toHaveLength(3);
  });

  it("does not treat 'is gone' as passive", () => {
    expect(has("The task is gone.", "passive-voice")).toBe(false);
  });

  it("marks passive and compound tense as advisory, others as hard", () => {
    const { findings } = lintText("The flag is set; we have begun.");
    expect(findings.find((f) => f.rule === "passive-voice")?.level).toBe("advisory");
    expect(hardFindings(findings).map((f) => f.rule)).toEqual(["semicolon"]);
  });
});

describe("code is ignored and columns stay true", () => {
  it("skips fenced code", () => {
    expect(lintText("```\nx = a; y = b\n```").findings).toEqual([]);
  });
  it("masks inline code without shifting columns", () => {
    const phrasal = lintText("Run `make all` then spin up the node.").findings.filter((f) => f.rule === "phrasal-verb");
    expect(phrasal).toHaveLength(1);
    expect(phrasal[0].col).toBe(21);
  });
  it("ignores semicolons inside inline code", () => {
    expect(has("Run `a; b` now.", "semicolon")).toBe(false);
  });
});

describe("long sentences", () => {
  it("flags a sentence over 25 words and not one at 25", () => {
    expect(has(`${"word ".repeat(30).trim()}.`, "long-sentence")).toBe(true);
    expect(has(`${"word ".repeat(25).trim()}.`, "long-sentence")).toBe(false);
  });
  it("counts a wrapped sentence once, at its start", () => {
    const f = lintText(`Intro text here.\nThe ${twenty}\nwrapped tail words go here.`).findings.filter(
      (x) => x.rule === "long-sentence",
    );
    expect(f).toHaveLength(1);
    expect([f[0].line, f[0].col]).toEqual([2, 1]);
  });
  it.each(["\n\n", "\n# Heading\n", "\n---\n", "\n- ", "\n> "])("ends a block at %j", (sep) => {
    expect(has(`First ${twenty} line${sep}Second ${twenty} line.`, "long-sentence")).toBe(false);
  });
  it("does not end a sentence at abbreviations", () => {
    expect(has(`Use a tool, e.g. the ${twenty} linter here now.`, "long-sentence")).toBe(true);
    expect(has(`Compare A vs. B in the ${twenty} test.`, "long-sentence")).toBe(true);
  });
  it("ends a sentence after closing quotes and before a capitalised dotted abbreviation", () => {
    expect(has(`He asked "${twenty}?" Then ${twenty} ended. (It ${twenty}.) Next.`, "long-sentence")).toBe(false);
    expect(has(`The team shipped it in the U.S. Then ${twenty} today.`, "long-sentence")).toBe(false);
  });
  it("treats each table cell as its own block", () => {
    const short = Array.from({ length: 24 }, (_, i) => `term${i + 1}`).join(" ") + ".";
    const long = Array.from({ length: 26 }, (_, i) => `term${i + 1}`).join(" ") + ".";
    expect(has(`| Label | Detail |\n| --- | --- |\n| Clear | ${short} |`, "long-sentence")).toBe(false);
    expect(
      lintText(`| Label | Detail |\n| --- | --- |\n| Clear | ${long} |`).findings.filter(
        (f) => f.rule === "long-sentence",
      ),
    ).toHaveLength(1);
  });
  it("stays fast on a long block", () => {
    const started = Date.now();
    expect(has("The agent read the log.\n".repeat(20000), "long-sentence")).toBe(false);
    expect(Date.now() - started).toBeLessThan(3000);
  });
});

describe("dangling conjunctions", () => {
  it("flags list items ending in and/or for all marker styles", () => {
    const f = lintText(
      "- Confirm the target and\n* Record the result OR  \n+ Close the panel\n1. Start the task and\n2) Stop the task OR",
    ).findings.filter((x) => x.rule === "dangling-conjunction");
    expect(f.map((x) => x.line)).toEqual([1, 2, 4, 5]);
    expect(f.every((x) => x.level === "advisory-free")).toBe(true);
  });
  it("accepts continued items, code, and prose", () => {
    expect(has("  - Confirm the target and\n    record the result.", "dangling-conjunction")).toBe(false);
    expect(has("- Combine `left` and `right`", "dangling-conjunction")).toBe(false);
    expect(has("```text\n- code and\n```", "dangling-conjunction")).toBe(false);
    expect(has("The process may include steps and", "dangling-conjunction")).toBe(false);
  });
  it("flags the continuation line when the conjunction ends a wrapped item", () => {
    const f = lintText("- Confirm the target\n  and").findings.filter((x) => x.rule === "dangling-conjunction");
    expect(f).toHaveLength(1);
    expect([f[0].line, f[0].col]).toEqual([2, 3]);
  });
});

describe("synonym rotation", () => {
  it("advises on the second member and names the keeper", () => {
    const f = lintText("Check the config file. Then verify the output. Verify twice.").findings.filter(
      (x) => x.rule === "synonym-rotation",
    );
    expect(f).toHaveLength(1);
    expect(f[0].level).toBe("advisory");
    expect(f[0].message).toContain("'verify' and 'check'");
  });
  it("accepts one consistent term", () => {
    expect(has("Check the config. Check the output.", "synonym-rotation")).toBe(false);
  });
});
