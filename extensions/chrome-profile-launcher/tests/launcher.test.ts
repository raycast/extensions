import { execFileSync } from "child_process";
import { describe, expect, it } from "vitest";
import { buildLaunchCommand } from "../src/lib/chrome-launcher";
import { shellQuoteArg } from "../src/lib/shell-quote";

/** Ask a real shell to expand the quoted token and return what it produced. */
function shellExpand(quoted: string): string {
  return execFileSync("/bin/sh", ["-c", `printf %s ${quoted}`]).toString();
}

describe("shellQuoteArg", () => {
  const cases = [
    "Profile 2",
    "Andy",
    "Default",
    'weird"quote',
    "dollar$ign",
    "back\\slash",
    "tick`mark`",
    "spaces and $tuff \"mixed\"",
  ];

  it.each(cases)("round-trips %j through the shell unchanged", (value) => {
    expect(shellExpand(shellQuoteArg(value))).toBe(value);
  });

  it("keeps simple names in the canonical double-quoted form", () => {
    expect(shellQuoteArg("Profile 2")).toBe('"Profile 2"');
    expect(shellQuoteArg("Andy")).toBe('"Andy"');
  });
});

describe("buildLaunchCommand", () => {
  it("matches the canonical command for a simple directory", () => {
    expect(buildLaunchCommand("Profile 2")).toBe(
      'open -na "Google Chrome" --args --profile-directory="Profile 2" --new-window "chrome://newtab"',
    );
  });

  it("stays shell-safe for an awkward directory name", () => {
    const cmd = buildLaunchCommand('a"b$c');
    // The directory is embedded as an escaped, shell-safe token...
    expect(cmd).toContain('--profile-directory="a\\"b\\$c"');
    // ...and that token round-trips through a real shell back to the original.
    expect(shellExpand(shellQuoteArg('a"b$c'))).toBe('a"b$c');
  });
});
