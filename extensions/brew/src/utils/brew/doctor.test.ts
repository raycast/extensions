/**
 * `brew doctor --json` parsing.
 *
 * SAMPLE below is captured verbatim from `brew doctor --json` on 2026-09-14
 * (Homebrew 7.0.1-11-gd2c0312), which exits 1 with the JSON still on stdout.
 *
 * The parser is deliberately STRICT: brew's `Finding#to_h` always emits every
 * key, so a payload that does not match is a brew we do not understand, not a
 * finding to render half of.
 */

import { describe, expect, it } from "vitest";
import { ParseError } from "../errors";
import { doctorReportMarkdown, findingTitle, parseBrewDoctor, tierLabel, worstTier } from "./doctor";
import type { DoctorFinding, DoctorTier } from "./doctor";

const SAMPLE = `{
  "tier": 1,
  "findings": [
    {
      "text": "Some directories in the Caskroom do not have valid metadata.\\nThe following casks cannot be upgraded as-is:\\n  /opt/homebrew/Caskroom/ollama-app\\n  /opt/homebrew/Caskroom/figma\\n  /opt/homebrew/Caskroom/chatgpt-atlas\\n",
      "tier": 1,
      "affects": [],
      "links": [],
      "remediation": {
        "commands": [
          "brew reinstall --cask --force ollama-app",
          "brew reinstall --cask --force figma",
          "brew reinstall --cask --force chatgpt-atlas"
        ],
        "text": "To fix this, run:\\n  brew reinstall --cask --force ollama-app\\n  brew reinstall --cask --force figma\\n  brew reinstall --cask --force chatgpt-atlas\\n"
      }
    }
  ]
}`;

function finding(over: Record<string, unknown> = {}): Record<string, unknown> {
  return { text: "t", tier: 1, affects: [], links: [], remediation: null, ...over };
}

function report(findings: unknown[], tier: unknown = 1): string {
  return JSON.stringify({ tier, findings });
}

describe("parseBrewDoctor", () => {
  it("parses the real sample", () => {
    const parsed = parseBrewDoctor(SAMPLE);

    expect(parsed.tier).toBe(1);
    expect(parsed.findings).toHaveLength(1);

    const f = parsed.findings[0];
    expect(f.tier).toBe(1);
    expect(f.affects).toEqual([]);
    expect(f.links).toEqual([]);
    expect(f.remediation?.commands).toEqual([
      "brew reinstall --cask --force ollama-app",
      "brew reinstall --cask --force figma",
      "brew reinstall --cask --force chatgpt-atlas",
    ]);
    expect(f.remediation?.text).toContain("To fix this, run:");
    expect(findingTitle(f)).toBe("Some directories in the Caskroom do not have valid metadata.");
  });

  it("parses a healthy system", () => {
    const parsed = parseBrewDoctor(`{"tier":1,"findings":[]}`);
    expect(parsed.tier).toBe(1);
    expect(parsed.findings).toHaveLength(0);
  });

  it("keeps a null remediation and a text-only remediation", () => {
    const parsed = parseBrewDoctor(
      report([finding(), finding({ remediation: { commands: [], text: "Do it by hand." } })]),
    );
    expect(parsed.findings[0].remediation).toBeNull();
    expect(parsed.findings[1].remediation).toEqual({ commands: [], text: "Do it by hand." });
  });

  it("keeps the unsupported tier", () => {
    const parsed = parseBrewDoctor(report([finding({ tier: "unsupported" })], "unsupported"));
    expect(parsed.tier).toBe("unsupported");
    expect(parsed.findings[0].tier).toBe("unsupported");
  });

  it.each([
    ["empty output", ""],
    ["whitespace only", "   \n"],
    ["not json", "not json"],
    ["an array root", "[]"],
    ["findings not an array", `{"tier":1,"findings":"x"}`],
    ["a bad root tier", report([], 2.5 as unknown)],
    ["a finding that is not an object", report(["nope"])],
    ["a non-string text", report([finding({ text: 7 })])],
    ["a bad finding tier", report([finding({ tier: "sorta" })])],
    ["affects that is not an array", report([finding({ affects: "figma" })])],
    ["a non-string inside links", report([finding({ links: [1] })])],
    ["missing links", report([{ text: "t", tier: 1, affects: [], remediation: null }])],
    ["a remediation without commands", report([finding({ remediation: { text: "x" } })])],
    ["a remediation with non-string commands", report([finding({ remediation: { commands: [1], text: "x" } })])],
  ])("throws ParseError on %s", (_label, json) => {
    expect(() => parseBrewDoctor(json)).toThrow(ParseError);
  });

  it("names the cause on invalid JSON", () => {
    try {
      parseBrewDoctor("{oops");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError);
      expect((err as ParseError).brewCause).toBeInstanceOf(Error);
    }
  });
});

describe("tierLabel", () => {
  it("labels integer tiers and the unsupported tier", () => {
    expect(tierLabel(1)).toBe("Tier 1");
    expect(tierLabel(2)).toBe("Tier 2");
    expect(tierLabel(3)).toBe("Tier 3");
    expect(tierLabel("unsupported")).toBe("Unsupported");
  });
});

describe("findingTitle", () => {
  it("takes the first non-empty line, trimmed", () => {
    expect(
      findingTitle({ text: "  \nFirst line.  \nSecond.\n", tier: 1, affects: [], links: [], remediation: null }),
    ).toBe("First line.");
  });
});

describe("worstTier", () => {
  const at = (tier: DoctorTier): DoctorFinding => ({ text: "t", tier, affects: [], links: [], remediation: null });

  it("takes the highest tier present, with unsupported worst of all", () => {
    expect(worstTier([at(1), at(3), at(2)])).toBe(3);
    expect(worstTier([at(3), at("unsupported"), at(1)])).toBe("unsupported");
  });

  it("is tier 1 when there are no findings", () => {
    expect(worstTier([])).toBe(1);
  });
});

describe("doctorReportMarkdown", () => {
  const f = (over: Partial<DoctorFinding> = {}): DoctorFinding => ({
    text: "t",
    tier: 1,
    affects: [],
    links: [],
    remediation: null,
    ...over,
  });

  it("renders findings in brew's own order, one heading each labelled with its tier", () => {
    const md = doctorReportMarkdown({
      tier: 1,
      findings: [f({ tier: "unsupported", text: "u" }), f({ tier: 2, text: "b" }), f({ tier: 1, text: "a" })],
    });
    expect(md.match(/^### .*$/gm)).toEqual(["### u — Unsupported", "### b — Tier 2", "### a — Tier 1"]);
    expect(md).not.toMatch(/^## /m);
  });

  it("lengthens the fence past any backtick run in the content", () => {
    const md = doctorReportMarkdown({
      tier: 1,
      findings: [f({ text: "see ``` fence", remediation: { text: "", commands: ["echo '```'"] } })],
    });
    expect(md).toContain("````\nsee ``` fence\n````");
    expect(md).toContain("````sh\necho '```'\n````");
  });

  it("keeps brew's own wrapping and indentation by fencing the finding text", () => {
    const md = doctorReportMarkdown({ tier: 1, findings: [f({ text: "Line one.\n  indented *not* italic\n" })] });
    expect(md).toContain("```\nLine one.\n  indented *not* italic\n```");
  });

  it("renders remediation prose and one fenced sh block with a command per line", () => {
    const md = doctorReportMarkdown({
      tier: 1,
      findings: [f({ remediation: { text: "To fix this, run:", commands: ["brew reinstall figma", "brew cleanup"] } })],
    });
    expect(md).toContain("To fix this, run:");
    expect(md).toContain("```sh\nbrew reinstall figma\nbrew cleanup\n```");
  });

  it("fences the remediation text so brew's own line breaks survive", () => {
    const md = doctorReportMarkdown({
      tier: 1,
      findings: [f({ remediation: { text: "To fix this, run:\n  brew cleanup\n", commands: ["brew cleanup"] } })],
    });
    expect(md).toContain("```\nTo fix this, run:\n  brew cleanup\n```");
  });

  it("omits the commands block when the remediation text already lists every command", () => {
    const md = doctorReportMarkdown({
      tier: 1,
      findings: [
        f({
          remediation: {
            text: "To fix this, run:\n  brew reinstall figma\n  brew cleanup\n",
            commands: ["brew reinstall figma", "brew cleanup"],
          },
        }),
      ],
    });
    expect(md).not.toContain("```sh");
  });

  it("keeps the commands block when the text only mentions a command as a prefix", () => {
    const md = doctorReportMarkdown({
      tier: 1,
      findings: [f({ remediation: { text: "Run brew cleanup --prune=all", commands: ["brew cleanup"] } })],
    });
    expect(md).toContain("```sh\nbrew cleanup\n```");
  });

  it("dedupes against indented lines, matching the whole line", () => {
    const md = doctorReportMarkdown({
      tier: 1,
      findings: [f({ remediation: { text: "To fix this, run:\n      brew cleanup\n", commands: ["brew cleanup"] } })],
    });
    expect(md).not.toContain("```sh");
  });

  it("keeps the commands block when the remediation text is empty", () => {
    const md = doctorReportMarkdown({
      tier: 1,
      findings: [f({ remediation: { text: "", commands: ["brew cleanup"] } })],
    });
    expect(md).toContain("```sh\nbrew cleanup\n```");
  });

  it("keeps the commands block when the text lists only some of the commands", () => {
    const md = doctorReportMarkdown({
      tier: 1,
      findings: [
        f({
          remediation: { text: "To fix this, run:\n  brew cleanup\n", commands: ["brew cleanup", "brew doctor"] },
        }),
      ],
    });
    expect(md).toContain("```sh\nbrew cleanup\nbrew doctor\n```");
  });

  it("lists links as bullets and omits fix sections when there is no remediation", () => {
    const md = doctorReportMarkdown({ tier: 1, findings: [f({ links: ["https://docs.brew.sh/FAQ"] })] });
    expect(md).toContain("- [https://docs.brew.sh/FAQ](https://docs.brew.sh/FAQ)");
    expect(md).not.toContain("```sh");
  });

  it("returns an empty string for a healthy report", () => {
    expect(doctorReportMarkdown({ tier: 1, findings: [] })).toBe("");
  });
});
