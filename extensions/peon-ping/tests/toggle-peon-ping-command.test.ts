import { expect, test, vi } from "vitest";
import type { PeonPingResolvedPaths } from "../src/lib/peon-ping-paths";
import type { PeonPingCommandRunner } from "../src/lib/peon-ping-service";
import { LaunchType } from "@raycast/api";
import { runTogglePeonPingCommand } from "../src/toggle-peon-ping";

const dummyPaths: PeonPingResolvedPaths = {
  claudeConfigDir: "/tmp/claude",
  installDir: "/tmp/claude/hooks/peon-ping",
  peonDir: "/tmp/claude/hooks/peon-ping",
  packsDir: "/tmp/claude/hooks/peon-ping/packs",
  configFilePath: "/tmp/claude/hooks/peon-ping/config.json",
  pausedFilePath: "/tmp/claude/hooks/peon-ping/.paused",
  scriptPath: "/tmp/claude/hooks/peon-ping/peon.sh",
};

test("runTogglePeonPingCommand shows Peon Ping On HUD and refreshes menu bar command", async () => {
  const run = vi.fn() as unknown as PeonPingCommandRunner;
  const togglePeonPing = vi.fn(() => ({
    message: "toggled",
    status: { enabled: true },
  }));
  const showHUD = vi.fn().mockResolvedValue(undefined);
  const launchCommand = vi.fn().mockResolvedValue(undefined);

  await runTogglePeonPingCommand({
    paths: dummyPaths,
    run,
    togglePeonPing,
    showHUD,
    launchCommand,
  });

  expect(togglePeonPing).toHaveBeenCalledWith(dummyPaths, run);
  expect(showHUD).toHaveBeenCalledWith("Peon Ping On");
  expect(launchCommand).toHaveBeenCalledWith({
    name: "peon-ping-menu-bar",
    type: LaunchType.Background,
  });
});

test("runTogglePeonPingCommand shows Peon Ping Off HUD when effective state is off", async () => {
  const run = vi.fn() as unknown as PeonPingCommandRunner;
  const togglePeonPing = vi.fn(() => ({
    message: "toggled",
    status: { enabled: false },
  }));
  const showHUD = vi.fn().mockResolvedValue(undefined);
  const launchCommand = vi.fn().mockResolvedValue(undefined);

  await runTogglePeonPingCommand({
    paths: dummyPaths,
    run,
    togglePeonPing,
    showHUD,
    launchCommand,
  });

  expect(showHUD).toHaveBeenCalledWith("Peon Ping Off");
  expect(launchCommand).toHaveBeenCalledWith({
    name: "peon-ping-menu-bar",
    type: LaunchType.Background,
  });
});

test("runTogglePeonPingCommand still succeeds when menu bar command is not activated", async () => {
  const run = vi.fn() as unknown as PeonPingCommandRunner;
  const togglePeonPing = vi.fn(() => ({
    message: "toggled",
    status: { enabled: true },
  }));
  const showHUD = vi.fn().mockResolvedValue(undefined);
  const launchCommand = vi
    .fn()
    .mockRejectedValue(
      new Error(
        'Command "Peon Ping Menu Bar" must be activated before it can be run in the background',
      ),
    );

  await expect(
    runTogglePeonPingCommand({
      paths: dummyPaths,
      run,
      togglePeonPing,
      showHUD,
      launchCommand,
    }),
  ).resolves.toEqual({
    message: "toggled",
    status: { enabled: true },
  });

  expect(showHUD).toHaveBeenCalledWith("Peon Ping On");
});
