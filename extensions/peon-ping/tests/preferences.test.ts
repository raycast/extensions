import { afterEach, expect, test } from "vitest";
import { getResolvePeonPingPathsInputFromPreferences } from "../src/lib/preferences";

const originalClaudePeonDir = process.env.CLAUDE_PEON_DIR;

afterEach(() => {
  if (originalClaudePeonDir === undefined) {
    delete process.env.CLAUDE_PEON_DIR;
    return;
  }
  process.env.CLAUDE_PEON_DIR = originalClaudePeonDir;
});

test("getResolvePeonPingPathsInputFromPreferences includes CLAUDE_PEON_DIR", () => {
  process.env.CLAUDE_PEON_DIR = "/tmp/peon";

  expect(getResolvePeonPingPathsInputFromPreferences()).toMatchObject({
    claudePeonDirEnv: "/tmp/peon",
  });
});
