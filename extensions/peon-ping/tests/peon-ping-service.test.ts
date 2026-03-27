import { existsSync, writeFileSync } from "node:fs";
import { expect, test } from "vitest";
import { getPeonPingStatus } from "../src/lib/peon-ping-config";
import { resolvePeonPingPaths } from "../src/lib/peon-ping-paths";
import {
  togglePeonPing,
  type PeonPingCommandRunner,
} from "../src/lib/peon-ping-service";
import { createClaudeConfigFixture } from "./helpers/claude-config-fixture";

test("togglePeonPing runs bash scriptPath toggle and returns message and refreshed status", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });
  writeFileSync(paths.scriptPath, "");
  const run: PeonPingCommandRunner = (command, args) => {
    expect(command).toBe("bash");
    expect(args).toEqual([paths.scriptPath, "toggle"]);
    if (existsSync(fx.pausedFilePath)) {
      fx.removePaused();
      return "peon-ping: sounds resumed\n";
    }
    fx.touchPaused();
    return "peon-ping: sounds paused (run 'peon toggle' to unpause)\n";
  };
  const result = togglePeonPing(paths, run);
  expect(result.message).toBe(
    "peon-ping: sounds paused (run 'peon toggle' to unpause)",
  );
  expect(result.status).toEqual(
    getPeonPingStatus(paths.configFilePath, paths.pausedFilePath),
  );
  expect(result.status.enabled).toBe(false);
});

test("togglePeonPing wraps missing script with install hint", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });
  expect(() =>
    togglePeonPing(paths, () => {
      throw new Error("run should not be invoked");
    }),
  ).toThrow(`peon-ping is not installed at ${paths.scriptPath}`);
});
