import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contract test on the `morning-briefing` SKILL.md content itself, not on
 * a model output. Purpose: catch future edits that quietly drop the literal
 * `[t_<id>]` format requirement, the per-section bullet caps, or the
 * aggregated-noise rule. These constraints are easy to lose during a casual
 * upstream sync; this test is the safety net.
 */

const SKILL_PATH = join(__dirname, "..", "skills", "morning-briefing", "SKILL.md");
const skill = readFileSync(SKILL_PATH, "utf8");

describe("morning-briefing SKILL.md contract", () => {
  it("requires the literal [t_<id>] prefix on VIP / Action items", () => {
    // Look for "[t_abc123def]" inline literal AND a sentence that mandates it.
    expect(skill).toMatch(/\[t_[a-z0-9]+\]/i);
    expect(skill).toMatch(/MUST include the thread id/i);
  });

  it("requires each VIP / Action / FYI section to be capped at 10 items", () => {
    expect(skill).toMatch(/≤\s*10/);
    expect(skill).toMatch(/shown of .* total/);
  });

  it("requires aggregated 'Likely noise' on exactly one line", () => {
    expect(skill).toMatch(/Likely noise.*one line/i);
    expect(skill).toMatch(/Aggregate by sender/i);
    // Format hint with `× N`:
    expect(skill).toMatch(/×\s*\d/);
  });

  it("declares a 'verify before returning' checklist", () => {
    expect(skill).toMatch(/verify before returning/i);
  });

  it("forbids drafting / archiving / labeling (read-only contract)", () => {
    expect(skill).toMatch(/No drafts\. No archiving\. No labels\./);
  });

  it("forbids meta-commentary preamble", () => {
    expect(skill).toMatch(/Do not add a meta-commentary preamble/i);
  });

  it("frontmatter has upstream_sha empty (local override flag)", () => {
    const fm = skill.match(/^---\n([\s\S]*?)\n---/);
    expect(fm).toBeTruthy();
    expect(fm?.[1]).toMatch(/upstream_sha:\s*""/);
  });

  it("declares the right tools_used", () => {
    expect(skill).toMatch(/tools_used:[\s\S]*query_email_and_calendar/);
    expect(skill).toMatch(/tools_used:[\s\S]*list_threads/);
    expect(skill).toMatch(/tools_used:[\s\S]*get_availability/);
  });
});

describe("morning-briefing format checker (shape-only)", () => {
  // Helper that simulates what we'd want the model to emit. If the skill
  // ever stops requiring the [t_<id>] format, this test would still pass
  // for a correctly-formatted output but the contract test above would
  // fail. Together they bracket the requirement.
  const exampleVip = "- [t_abc123def] Mario Bros — Re: pipe maintenance schedule";
  const exampleAction = "- [t_xyz789] Princess Peach — Castle inspection";
  const malformed = "- Mario Bros — Re: pipe maintenance schedule";

  const SHAPE = /^- \[t_[a-z0-9]+\]/;

  it("recognizes well-formed VIP / Action lines", () => {
    expect(SHAPE.test(exampleVip)).toBe(true);
    expect(SHAPE.test(exampleAction)).toBe(true);
  });

  it("rejects items without a thread id prefix", () => {
    expect(SHAPE.test(malformed)).toBe(false);
  });
});
