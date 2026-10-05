// tests/gui-status.test.ts
import { describe, it, expect } from "vitest";
import { isGuiRunning } from "../src/lib/gui-status";

describe("isGuiRunning", () => {
  it("returns true (skip) when cliPath isn't inside an .app", async () => {
    // Hand-built CLIs at /usr/local/bin etc. can't be tied to a specific
    // GUI process, so we over-permit rather than block.
    const got = await isGuiRunning("/usr/local/bin/some-fake-tasktick-bin");
    expect(got).toBe(true);
  });

  it("returns false when the .app's GUI binary isn't running", async () => {
    // Use a synthetic path that won't match any pgrep result.
    const got = await isGuiRunning(
      "/Applications/NoSuchApp-fixture.app/Contents/cli/tasktick",
    );
    expect(got).toBe(false);
  });
});
