import {
  Icon,
  MenuBarExtra,
  environment,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fs from "fs";
import os from "os";
import path from "path";

interface HotkeyEntry {
  title: string;
  sub: string;
  group: string;
  combo: string;
  key: string;
  mods: string[];
  cleared?: boolean;
}

interface HotkeysData {
  groups: Record<string, { name: string; color: string }>;
  hotkeys: HotkeyEntry[];
  aliases: { alias: string; title: string; group: string }[];
}

function loadHotkeysData(): HotkeysData {
  const userJsonPath = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "RaycastHotkeysMap",
    "hotkeys.json",
  );
  const bundledJsonPath = path.join(environment.assetsPath, "hotkeys.json");
  const jsonPath = fs.existsSync(userJsonPath) ? userJsonPath : bundledJsonPath;
  const raw = fs.readFileSync(jsonPath, "utf8");
  return JSON.parse(raw) as HotkeysData;
}

export default function Command() {
  const iconPath = path.join(environment.assetsPath, "app-icon.png");
  const data = loadHotkeysData();
  const activeHotkeys = data.hotkeys.filter((h) => !h.cleared && h.key);

  async function openMap() {
    try {
      await launchCommand({
        name: "open-hotkeys-map",
        type: LaunchType.UserInitiated,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to open Hotkeys Map" });
    }
  }

  return (
    <MenuBarExtra icon={{ source: iconPath }} tooltip="Raycast Hotkeys Map">
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={`Open Hotkeys Map (${activeHotkeys.length})`}
          icon={Icon.AppWindow}
          onAction={openMap}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {Object.entries(data.groups).map(([groupId, group]) => {
          const items = activeHotkeys.filter((h) => h.group === groupId);
          if (items.length === 0) return null;
          return (
            <MenuBarExtra.Submenu
              key={groupId}
              title={`${group.name} (${items.length})`}
              icon={Icon.Keyboard}
            >
              {items.map((item) => (
                <MenuBarExtra.Item
                  key={`${item.title}-${item.combo}`}
                  title={`${item.title}  —  ${item.combo}`}
                  onAction={openMap}
                />
              ))}
            </MenuBarExtra.Submenu>
          );
        })}
      </MenuBarExtra.Section>
      {data.aliases.length > 0 && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Submenu
            title={`Aliases (${data.aliases.length})`}
            icon={Icon.Terminal}
          >
            {data.aliases.map((a) => (
              <MenuBarExtra.Item
                key={a.alias}
                title={`${a.alias}  →  ${a.title}`}
                onAction={openMap}
              />
            ))}
          </MenuBarExtra.Submenu>
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
