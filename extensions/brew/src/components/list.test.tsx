import { describe, expect, it, vi } from "vitest";
import type { Cask, Formula } from "../utils/types";
import { CaskListItem, FormulaListItem } from "./list";

vi.mock("@raycast/api", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  List: Object.assign(() => null, { Item: () => null, Section: () => null }),
}));
vi.mock("@raycast/utils", () => ({ getProgressIcon: () => "progress" }));
vi.mock("./actionPanels", () => ({
  CaskActionPanel: () => null,
  FormulaActionPanel: () => null,
  PagingSection: () => null,
}));
vi.mock("./listItemDetail", () => ({
  CaskListItemDetail: () => null,
  FormulaListItemDetail: () => null,
}));
vi.mock("../utils", () => ({
  brewFormatVersion: () => "1.0",
  brewInstalledDate: () => undefined,
  brewIsInstalled: () => true,
  brewIsOutdated: () => false,
  brewName: () => "Test package",
  brewHost: {},
  preferences: {},
}));

// Homebrew's JSON may contain desc: null, despite the narrower local types.
function packageJson(description: string | null | undefined) {
  return JSON.parse(JSON.stringify({ name: "test", token: "test", versions: { stable: "1.0" }, desc: description }));
}

const common = { isInstalled: () => true, onAction: () => {} };

describe.each([
  [
    "formula",
    (description: string | null | undefined, sidebar: boolean) =>
      FormulaListItem({ ...common, formula: packageJson(description) as Formula, showMetadataPanel: sidebar }),
  ],
  [
    "cask",
    (description: string | null | undefined, sidebar: boolean) =>
      CaskListItem({ ...common, cask: packageJson(description) as Cask, showMetadataPanel: sidebar }),
  ],
] as const)("%s list subtitles", (_kind, render) => {
  it.each([null, undefined])("omits a missing description (%s)", (description) => {
    const row = render(description, false);
    expect(row.props.subtitle).toBeUndefined();
    expect(JSON.stringify(row.props)).not.toContain('"subtitle":null');
  });

  it.each(["Package description", ""])("preserves a string description (%s)", (description) => {
    expect(render(description, false).props.subtitle).toBe(description);
  });

  it("keeps subtitles hidden when the metadata sidebar is shown", () => {
    expect(render("Package description", true).props.subtitle).toBeUndefined();
  });
});
