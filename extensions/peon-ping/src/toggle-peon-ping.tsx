import { launchCommand, LaunchType, showHUD } from "@raycast/api";
import { execFileSync } from "node:child_process";
import { getResolvePeonPingPathsInputFromPreferences } from "./lib/extensions/peon-ping/preferences";
import { resolvePeonPingPaths } from "./lib/extensions/peon-ping/peon-ping-paths";
import {
  togglePeonPing,
  type PeonPingCommandRunner,
} from "./lib/extensions/peon-ping/peon-ping-service";

const run: PeonPingCommandRunner = (command, args) =>
  execFileSync(command, [...args], { encoding: "utf8" });

export default async function Command() {
  const paths = resolvePeonPingPaths(
    getResolvePeonPingPathsInputFromPreferences(),
  );
  const result = togglePeonPing(paths, run);
  await showHUD(result.status.enabled ? "Peon Ping On" : "Peon Ping Off");

  try {
    await launchCommand({
      name: "peon-ping-menu-bar",
      type: LaunchType.Background,
    });
  } catch {}
}
