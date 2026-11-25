import { describe, expect, it, vi } from "vitest";

// Builds a Raycast Cache at import, which the test mock of @raycast/api lacks.
vi.mock("../utils/outdated-dirty", () => ({
  markOutdatedSnapshotDirty: () => undefined,
  clearOutdatedSnapshotDirty: () => undefined,
  isOutdatedSnapshotDirty: () => false,
}));
import { caskMetadataRows, formulaMetadataRows, type MetadataOptions } from "./packageMetadata";
import type { Cask, Formula } from "../utils/types";

// The list row shows when a package was installed, but the row's date
// accessory is hidden while the sidebar is open, so the sidebar carries it.
const options: MetadataOptions = { isInstalled: () => false, detail: { failed: false }, showDescription: false };
const installedRow = (rows: ReturnType<typeof formulaMetadataRows>) =>
  rows.find((row) => row.kind === "label" && row.key === "installed");

const rust = {
  name: "rust",
  tap: "homebrew/core",
  versions: { stable: "1.100.0", bottle: true },
  linked_keg: "1.100.0",
  dependencies: [],
  build_dependencies: [],
  installed: [
    { version: "1.99.1", installed_on_request: false, time: 1_792_400_000 },
    { version: "1.100.0", installed_on_request: false, time: 1_795_000_000 },
  ],
} as unknown as Formula;

describe("Installed row in the sidebar", () => {
  it("dates an installed formula by the version brew uses", () => {
    const expected = new Date(1_795_000_000 * 1000).toLocaleDateString(undefined, { dateStyle: "medium" });
    expect(installedRow(formulaMetadataRows(rust, options))).toMatchObject({ title: "Installed", text: expected });
  });

  it("dates an installed cask", () => {
    const cask = {
      token: "iterm2",
      tap: "homebrew/cask",
      installed: "3.6.0",
      installed_time: 1_790_000_000,
    } as unknown as Cask;
    const expected = new Date(1_790_000_000 * 1000).toLocaleDateString(undefined, { dateStyle: "medium" });
    expect(installedRow(caskMetadataRows(cask, options))).toMatchObject({ title: "Installed", text: expected });
  });

  it("has no Installed row for a package that is not installed", () => {
    const jq = { ...rust, name: "jq", installed: [], linked_keg: null } as unknown as Formula;
    expect(installedRow(formulaMetadataRows(jq, options))).toBeUndefined();
  });
});
