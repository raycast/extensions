import {
  Icon,
  LaunchType,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
} from "@raycast/api";
import { execFileSync } from "node:child_process";
import { getPeonPingStatus } from "./lib/peon-ping-config";
import { getMenuBarPresentation } from "./lib/menu-bar-presentation";
import { getResolvePeonPingPathsInputFromPreferences } from "./lib/preferences";
import { resolvePeonPingPaths } from "./lib/peon-ping-paths";
import {
  togglePeonPing,
  type PeonPingCommandRunner,
} from "./lib/peon-ping-service";

const run: PeonPingCommandRunner = (command, args) =>
  execFileSync(command, [...args], { encoding: "utf8" });

export default function Command() {
  const prefs = getPreferenceValues<Preferences.PeonPingMenuBar>();
  if (!prefs.showMenuBarIcon) {
    return null;
  }
  const paths = resolvePeonPingPaths(
    getResolvePeonPingPathsInputFromPreferences(),
  );
  const status = getPeonPingStatus(paths.configFilePath, paths.pausedFilePath);
  const presentation = getMenuBarPresentation({
    showMenuBarIcon: true,
    enabled: status.enabled,
  });
  const icon =
    presentation.iconToken === "on" ? Icon.SpeakerOn : Icon.SpeakerOff;
  return (
    <MenuBarExtra
      icon={icon}
      title={presentation.title}
      tooltip={presentation.tooltip}
    >
      <MenuBarExtra.Item
        title="Toggle Peon Ping"
        onAction={async () => {
          togglePeonPing(paths, run);
          await launchCommand({
            name: "peon-ping-menu-bar",
            type: LaunchType.Background,
          });
        }}
      />
    </MenuBarExtra>
  );
}
