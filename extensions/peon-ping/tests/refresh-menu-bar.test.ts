import { expect, test, vi } from "vitest";
import { LaunchType } from "@raycast/api";
import { refreshMenuBarCommand } from "../src/lib/refresh-menu-bar";

test("refreshMenuBarCommand launches the menu bar command in background", async () => {
  const launchCommand = vi.fn().mockResolvedValue(undefined);

  await refreshMenuBarCommand({ launchCommand });

  expect(launchCommand).toHaveBeenCalledWith({
    name: "peon-ping-menu-bar",
    type: LaunchType.Background,
  });
});

test("refreshMenuBarCommand ignores menu bar not activated errors", async () => {
  const launchCommand = vi.fn().mockRejectedValue(
    new Error(
      'Command "Peon Ping Menu Bar" must be activated before it can be run in the background',
    ),
  );

  await expect(refreshMenuBarCommand({ launchCommand })).resolves.toBeUndefined();
});

test("refreshMenuBarCommand rethrows unrelated errors", async () => {
  const unrelated = new Error("network failure");
  const launchCommand = vi.fn().mockRejectedValue(unrelated);

  await expect(refreshMenuBarCommand({ launchCommand })).rejects.toBe(unrelated);
});
