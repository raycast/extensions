import { MenuBarExtra } from "@raycast/api";
import { execFileSync } from "node:child_process";
import { useState } from "react";
import { getPeonPingConfig } from "./lib/peon-ping-config";
import { getMenuBarPresentation } from "./lib/menu-bar-presentation";
import { withPeonPingCommandTarget } from "./lib/peon-ping-command-target";
import { getResolvePeonPingPathsInputFromPreferences } from "./lib/preferences";
import { resolvePeonPingPaths } from "./lib/peon-ping-paths";
import {
  togglePeonPing,
  type PeonPingCommandRunner,
} from "./lib/peon-ping-service";
import { runToggleAction } from "./lib/peon-ping-actions";

const run: PeonPingCommandRunner = (command, args) =>
  execFileSync(command, [...args], { encoding: "utf8" });

export default function Command() {
  const paths = withPeonPingCommandTarget(
    resolvePeonPingPaths(getResolvePeonPingPathsInputFromPreferences()),
  );
  const [config, setConfig] = useState(() =>
    getPeonPingConfig(paths.configFilePath, paths.pausedFilePath),
  );

  const presentation = getMenuBarPresentation({
    enabled: config.effectivelyEnabled,
  });

  return (
    <MenuBarExtra
      icon={
        presentation.iconToken === "peonOn"
          ? {
              source: {
                light: "menu-bar-peon-on.svg",
                dark: "menu-bar-peon-on@dark.svg",
              },
            }
          : {
              source: {
                light: "menu-bar-peon-off.svg",
                dark: "menu-bar-peon-off@dark.svg",
              },
            }
      }
      tooltip={presentation.tooltip}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={presentation.toggleTitle}
          icon={presentation.toggleIcon}
          onAction={() =>
            runToggleAction({
              paths,
              run,
              togglePeonPing,
              setStatus: () => {
                setConfig(
                  getPeonPingConfig(paths.configFilePath, paths.pausedFilePath),
                );
              },
            })
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
