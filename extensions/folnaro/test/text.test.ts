import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TEXT, t } from "../src/lib/text";

describe("Texts", () => {
  it("follows the copy rules: no exclamation marks, no German left over", () => {
    for (const [key, text] of Object.entries(TEXT)) {
      expect(text.trim(), key).not.toBe("");
      expect(text, key).not.toMatch(/!/);
      expect(text, key).not.toMatch(/[äöüß]/i);
    }
  });

  it("uses the glossary terms, not the variants it rules out", () => {
    const all = Object.values(TEXT).join("\n");
    for (const banned of [/\bcredit note/i, /\baccountant/i, /\bsupplier/i, /\bvoucher/i, /\bcancelled\b/, /\bbooking/i, /\bAI\b/]) {
      expect(all).not.toMatch(banned);
    }
  });

  it("references only keys that exist", () => {
    const sources = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? sources(join(dir, entry.name)) : entry.name.match(/\.tsx?$/) ? [join(dir, entry.name)] : [],
      );
    const keys = new Set(Object.keys(TEXT));
    for (const file of sources(join(__dirname, "..", "src"))) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/(?<![\w.])t\("([a-zA-Z.]+)"/g)) {
        expect(keys.has(match[1]), `${file}: ${match[1]}`).toBe(true);
      }
    }
  });

  it("fills placeholders", () => {
    expect(t("timer.started", { target: "Website-Relaunch" })).toBe("Timer running for Website-Relaunch");
    expect(t("search.overdueBy", { days: 13 })).toBe("13 days overdue");
  });

  it("offers no language preference", () => {
    const manifest = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8"));
    expect(manifest.preferences.map((preference: { name: string }) => preference.name)).not.toContain("language");
  });
});
