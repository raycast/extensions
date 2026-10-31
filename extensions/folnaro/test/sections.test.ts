import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_SECTIONS, SECTION_GROUPS, sectionUrl } from "../src/lib/sections";
import { TEXT } from "../src/lib/text";

describe("Sections", () => {
  it("lists every sidebar section in the app's order and groups", () => {
    expect(SECTION_GROUPS.map((group) => [group.title, group.sections.map((section) => section.id)])).toEqual([
      ["section.group.today", ["overview", "suggestions", "time"]],
      ["section.group.money", ["invoices", "recurring", "income", "quotes", "expenses", "bank"]],
      ["section.group.work", ["projects", "customers", "contracts", "articles"]],
      ["section.group.taxes", ["reports", "taxAdvisor"]],
    ]);
  });

  it("draws every section with an icon Raycast has", () => {
    // An unknown name renders no icon at all, without an error (Tax Advisor had "Briefcase").
    const types = readFileSync(join(__dirname, "..", "node_modules/@raycast/api/types/index.d.ts"), "utf8");
    for (const section of ALL_SECTIONS) {
      expect(types, section.id).toMatch(new RegExp(`\\b${section.icon} =`));
    }
  });

  // The app's link source lives in the Folnaro repository; the published extension ships without it.
  const linkSource = join(
    __dirname,
    "..",
    "..",
    "..",
    "mac/Packages/FolnaroKit/Sources/FolnaroCore/Links/FolnaroLink.swift",
  );

  it.skipIf(!existsSync(linkSource))("matches the sections Folnaro's link accepts", () => {
    const source = readFileSync(linkSource, "utf8");
    const list = source.match(/static let sections: \[String\] = \[([^\]]*)\]/)![1];
    const accepted = [...list.matchAll(/"(\w+)"/g)].map((match) => match[1]);
    expect(ALL_SECTIONS.map((section) => section.id).sort()).toEqual([...accepted].sort());
  });

  it("opens a section through its folnaro link", () => {
    expect(sectionUrl({ id: "suggestions" })).toBe("folnaro://section/suggestions");
  });

  it("has a title for every section and group", () => {
    for (const group of SECTION_GROUPS) {
      expect(TEXT[group.title]).toBeTruthy();
      for (const section of group.sections) expect(TEXT[`section.${section.id}` as keyof typeof TEXT]).toBeTruthy();
    }
  });
});
