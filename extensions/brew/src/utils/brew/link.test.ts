/**
 * Cask link/unlink previews.
 *
 * Every stdout fixture below is captured verbatim from Homebrew 7.0.1 on
 * 2026-09-14 (`brew {link,unlink} --cask --dry-run <token>`), and the
 * `artifacts` fixtures from `brew info --cask --json=v2`. The shapes are the
 * whole problem: the header is printed even when nothing would change, the
 * `visual-studio-code` skip-warning goes to stderr rather than stdout, and a
 * font cask carries dozens of `artifacts` entries with no symlinked stanza
 * among them.
 */

import { describe, expect, it } from "vitest";
import { caskHasSymlinkArtifacts, compactCaskArtifacts, parseCaskLinkDryRun } from "./link";
import type { Cask, CaskArtifact } from "../types";

describe("parseCaskLinkDryRun", () => {
  it("reads the single path of an unlink", () => {
    expect(parseCaskLinkDryRun("Would remove:\n/opt/homebrew/bin/op\n")).toEqual(["/opt/homebrew/bin/op"]);
  });

  it("keeps brew's order for a multi-artifact unlink", () => {
    const stdout = [
      "Would remove:",
      "/opt/homebrew/share/man/man1/ghostty.1",
      "/opt/homebrew/share/man/man5/ghostty.5",
      "/opt/homebrew/etc/bash_completion.d/ghostty",
      "/opt/homebrew/share/fish/vendor_completions.d/ghostty.fish",
      "/opt/homebrew/share/zsh/site-functions/_ghostty",
      "",
    ].join("\n");
    expect(parseCaskLinkDryRun(stdout)).toEqual([
      "/opt/homebrew/share/man/man1/ghostty.1",
      "/opt/homebrew/share/man/man5/ghostty.5",
      "/opt/homebrew/etc/bash_completion.d/ghostty",
      "/opt/homebrew/share/fish/vendor_completions.d/ghostty.fish",
      "/opt/homebrew/share/zsh/site-functions/_ghostty",
    ]);
  });

  it("returns nothing for a bare header (already linked)", () => {
    expect(parseCaskLinkDryRun("Would link:\n")).toEqual([]);
    expect(parseCaskLinkDryRun("Would remove:\n")).toEqual([]);
  });

  it("returns nothing for empty output", () => {
    expect(parseCaskLinkDryRun("")).toEqual([]);
  });

  it("ignores anything that is not an absolute path under the header", () => {
    const stdout = "Would link:\n==> Something brew decided to say\n/opt/homebrew/bin/op\nrelative/path\n";
    expect(parseCaskLinkDryRun(stdout)).toEqual(["/opt/homebrew/bin/op"]);
  });

  it("ignores paths printed before any header", () => {
    expect(parseCaskLinkDryRun("/opt/homebrew/bin/op\n")).toEqual([]);
  });

  it("tolerates CRLF and trailing whitespace", () => {
    expect(parseCaskLinkDryRun("Would remove:\r\n/opt/homebrew/bin/op  \r\n")).toEqual(["/opt/homebrew/bin/op"]);
  });
});

describe("caskHasSymlinkArtifacts", () => {
  const ghostty: CaskArtifact[] = [
    { app: ["Ghostty.app"], target: "/Applications/Ghostty.app" },
    { manpage: ["/Applications/Ghostty.app/Contents/Resources/man/man1/ghostty.1"] },
    { bash_completion: ["/Applications/Ghostty.app/Contents/Resources/bash-completion/completions/ghostty.bash"] },
    { zsh_completion: ["/Applications/Ghostty.app/Contents/Resources/zsh/site-functions/_ghostty"] },
    { zap: [{ trash: ["~/.config/ghostty"] }] },
  ];
  const onePasswordCli: CaskArtifact[] = [
    { binary: ["op"], target: "/opt/homebrew/bin/op" },
    { generate_completions_from_executable: ["op", "completion"] },
    { zap: [{ trash: "~/.config/op" }] },
  ];
  const fontInter: CaskArtifact[] = [
    { font: ["InterVariable.ttf"], target: "/Users/messina/Library/Fonts/InterVariable.ttf" },
    { font: ["extras/otf/Inter-Black.otf"], target: "/Users/messina/Library/Fonts/Inter-Black.otf" },
  ];

  it("is true for a cask with manpages and completions", () => {
    expect(caskHasSymlinkArtifacts({ artifacts: ghostty })).toBe(true);
  });

  it("is true for a cask with a binary", () => {
    expect(caskHasSymlinkArtifacts({ artifacts: onePasswordCli })).toBe(true);
  });

  it("is false for a font cask", () => {
    expect(caskHasSymlinkArtifacts({ artifacts: fontInter })).toBe(false);
  });

  it("is false for an empty artifact list", () => {
    expect(caskHasSymlinkArtifacts({ artifacts: [] })).toBe(false);
  });

  it("is undefined when the record predates the field", () => {
    expect(caskHasSymlinkArtifacts({})).toBeUndefined();
  });

  it("reads the derived flag when the array is gone", () => {
    expect(caskHasSymlinkArtifacts({ has_symlink_artifacts: true })).toBe(true);
    expect(caskHasSymlinkArtifacts({ has_symlink_artifacts: false })).toBe(false);
  });

  it("prefers the array over a stale derived flag", () => {
    expect(caskHasSymlinkArtifacts({ artifacts: fontInter, has_symlink_artifacts: true })).toBe(false);
  });
});

describe("compactCaskArtifacts", () => {
  it("replaces the array with the answer read from it", () => {
    expect(compactCaskArtifacts({ artifacts: [{ binary: ["op"] }] })).toEqual({ has_symlink_artifacts: true });
    expect(compactCaskArtifacts({ artifacts: [{ font: ["Inter.ttf"] }] })).toEqual({ has_symlink_artifacts: false });
  });

  it("drops the variations that smuggle a second copy of the arrays", () => {
    const record: Pick<Cask, "artifacts" | "has_symlink_artifacts"> & {
      variations?: unknown;
      language_variations?: unknown;
    } = {
      artifacts: [{ binary: ["op"] }],
      variations: { sequoia: { artifacts: [{ binary: ["op"] }] } },
      language_variations: [{ artifacts: [] }],
    };
    expect(compactCaskArtifacts(record)).toEqual({ has_symlink_artifacts: true });
  });

  it("leaves a record with no artifacts unknown rather than claiming false", () => {
    const record: Pick<Cask, "artifacts" | "has_symlink_artifacts"> & { token: string } = { token: "acme" };
    expect(compactCaskArtifacts(record)).toEqual({ token: "acme" });
  });
});
