import { describe, expect, it } from "vitest";
import { packageStatus } from "./analyticsParse";

/** Every reason code in Homebrew's `deprecate_disable.rb`. */
const REASON_CODES = [
  "checksum_mismatch",
  "deprecated_upstream",
  "discontinued",
  "does_not_build",
  "fails_gatekeeper_check",
  "moved_to_mas",
  "no_license",
  "no_longer_available",
  "no_longer_meets_criteria",
  "repo_archived",
  "repo_removed",
  "unmaintained",
  "unreachable",
  "unsupported",
  "versioned_formula",
];

describe("packageStatus", () => {
  it("never shows a reason code as text", () => {
    for (const code of REASON_CODES) {
      const status = packageStatus({ disabled: true, disable_reason: code, disable_date: "2026-09-01" });
      expect(status?.text).not.toBe(code);
      expect(status?.text).not.toContain("_");
      expect(status?.detail).not.toContain("_");
    }
  });

  it("labels a code briefly and spells it out in the detail", () => {
    expect(
      packageStatus({ disabled: true, disable_reason: "fails_gatekeeper_check", disable_date: "2026-09-01" }),
    ).toEqual({
      title: "Disabled",
      text: "Fails Gatekeeper Check",
      detail: "Disabled since 2026-09-01 because it does not pass the macOS Gatekeeper check.",
    });
  });

  it("keeps the date out of the row, and gives the replacement its own field", () => {
    expect(
      packageStatus({
        deprecated: true,
        deprecation_reason: "unmaintained",
        deprecation_date: "2026-01-02",
        deprecation_replacement_formula: "ansible",
      }),
    ).toEqual({
      title: "Deprecated",
      text: "Not Maintained Upstream",
      detail: "Deprecated since 2026-01-02 because it is not maintained upstream. Use `ansible` instead.",
      replacement: "ansible",
    });
  });

  it("shortens a maintainer's own reason for the row and keeps it whole in the detail", () => {
    const reason = "requires a signed download URL, which is not supported by Homebrew";
    expect(packageStatus({ disabled: true, disable_reason: reason, disable_date: "2026-10-01" })).toEqual({
      title: "Disabled",
      text: "Requires a signed download URL",
      detail: `Disabled since 2026-10-01 because it ${reason}.`,
    });
  });

  it.each([
    ["needs end-of-life Qt 5. Cocoa support will be removed after 2026-11-19", "Needs end-of-life Qt 5"],
    ["superseded by v3.x; disables 2028-12-31", "Superseded by v3.x"],
    ["needs EOL `pcre`, OCaml < 5 and multiple workarounds to build", "Needs EOL pcre"],
    ["does not build with Zig >= 0.15", "Does not build with Zig >= 0.15"],
    [
      "is planned for EOL in next release (8.0.1) and uses EOL Tcl/Tk 8.6",
      "Is planned for EOL in next release (8.0.1) and uses EOL Tcl/Tk 8.6",
    ],
  ])("shortens %j", (reason, text) => {
    expect(packageStatus({ deprecated: true, deprecation_reason: reason })?.text).toBe(text);
  });

  it("uses the cask replacement when there is no formula replacement", () => {
    expect(
      packageStatus({ disabled: true, disable_reason: "discontinued", disable_replacement_cask: "other" })?.detail,
    ).toBe("Disabled because it is discontinued upstream. Use `other` instead.");
  });

  it.each([
    ["Replaced by foo.", "Disabled: Replaced by foo."],
    ["does not build on Sonoma!", "Disabled because it does not build on Sonoma!"],
    ["is unsafe?", "Disabled because it is unsafe?"],
  ])("ends %j with one stop", (reason, detail) => {
    expect(packageStatus({ disabled: true, disable_reason: reason })?.detail).toBe(detail);
  });

  it("still says something without a reason", () => {
    expect(packageStatus({ disabled: true })).toEqual({
      title: "Disabled",
      text: "This package can no longer be installed",
      detail: "Disabled: this package can no longer be installed.",
    });
    expect(packageStatus({ deprecated: true, deprecation_date: "2026-01-02" })).toEqual({
      title: "Deprecated",
      text: "No longer maintained",
      detail: "Deprecated since 2026-01-02: no longer maintained.",
    });
  });

  it("reports nothing for a package in good standing", () => {
    expect(packageStatus(undefined)).toBeUndefined();
    expect(packageStatus({ deprecated: false, disabled: false })).toBeUndefined();
  });
});

describe("packageStatus with malformed reasons", () => {
  it.each([", no longer builds", "; unsupported", ". unavailable"])("skips an empty first clause in %j", (reason) => {
    expect(() => packageStatus({ disabled: true, disable_reason: reason })).not.toThrow();
    expect(packageStatus({ disabled: true, disable_reason: reason })?.text).toMatch(/^[A-Z]/);
  });

  it("falls back when a reason is only whitespace or backticks", () => {
    for (const reason of ["   ", "``"]) {
      expect(packageStatus({ disabled: true, disable_reason: reason })).toEqual({
        title: "Disabled",
        text: "This package can no longer be installed",
        detail: "Disabled: this package can no longer be installed.",
      });
    }
  });

  it("trims a reason before capitalizing it", () => {
    expect(packageStatus({ disabled: true, disable_reason: " requires a signed URL" })?.text).toBe(
      "Requires a signed URL",
    );
  });
});
