import {
  LaunchType,
  launchCommand,
  showHUD,
} from "@raycast/api";
import { execFileSync } from "node:child_process";
import { getResolvePeonPingPathsInputFromPreferences } from "./lib/preferences";
import type { PeonPingResolvedPaths } from "./lib/peon-ping-paths";
import { resolvePeonPingPaths } from "./lib/peon-ping-paths";
import {
  togglePeonPing,
  type PeonPingCommandRunner,
  type TogglePeonPingResult,
} from "./lib/peon-ping-service";

export type RunTogglePeonPingCommandDeps = {
  paths: PeonPingResolvedPaths;
  run: PeonPingCommandRunner;
  togglePeonPing: typeof togglePeonPing;
  showHUD: (title: string) => Promise<void>;
  launchCommand: (options: {
    name: string;
    type: LaunchType;
  }) => Promise<void>;
};

export async function runTogglePeonPingCommand(
  deps: RunTogglePeonPingCommandDeps,
): Promise<TogglePeonPingResult> {
  const result = deps.togglePeonPing(deps.paths, deps.run);
  const title = result.status.enabled ? "Peon Ping On" : "Peon Ping Off";
  await deps.showHUD(title);
  await deps.launchCommand({
    name: "peon-ping-menu-bar",
    type: LaunchType.Background,
  });
  return result;
}

const run: PeonPingCommandRunner = (command, args) =>
  execFileSync(command, [...args], { encoding: "utf8" });

export default async function main() {
  const paths = resolvePeonPingPaths(
    getResolvePeonPingPathsInputFromPreferences(),
  );
  await runTogglePeonPingCommand({
    paths,
    run,
    togglePeonPing,
    showHUD,
    launchCommand,
  });
}
