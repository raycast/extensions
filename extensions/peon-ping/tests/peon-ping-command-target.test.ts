import { expect, test } from "vitest";
import { resolvePeonPingCommandTarget } from "../src/lib/peon-ping-command-target";
import type { PeonPingResolvedPaths } from "../src/lib/peon-ping-paths";

const paths: PeonPingResolvedPaths = {
  claudeConfigDir: "/tmp/claude",
  installDir: "/tmp/claude/hooks/peon-ping",
  peonDir: "/tmp/claude/hooks/peon-ping",
  packsDir: "/tmp/claude/hooks/peon-ping/packs",
  configFilePath: "/tmp/claude/hooks/peon-ping/config.json",
  pausedFilePath: "/tmp/claude/hooks/peon-ping/.paused",
  scriptPath: "/tmp/claude/hooks/peon-ping/peon.sh",
};

test("resolvePeonPingCommandTarget prefers peon from PATH", () => {
  const target = resolvePeonPingCommandTarget(paths, {
    pathEnv: "/opt/homebrew/bin:/usr/bin",
    hasExecutable: (candidate) => candidate === "/opt/homebrew/bin/peon",
  });

  expect(target).toEqual({
    source: "cli",
    command: "/opt/homebrew/bin/peon",
    executablePath: "/opt/homebrew/bin/peon",
    argsPrefix: [],
  });
});

test("resolvePeonPingCommandTarget falls back to bash peon.sh", () => {
  const target = resolvePeonPingCommandTarget(paths, {
    pathEnv: "/usr/bin:/bin",
    hasExecutable: () => false,
  });

  expect(target).toEqual({
    source: "script",
    command: "bash",
    executablePath: paths.scriptPath,
    argsPrefix: [paths.scriptPath],
  });
});
