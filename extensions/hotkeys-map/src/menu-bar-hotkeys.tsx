import {
  Icon,
  MenuBarExtra,
  environment,
  launchCommand,
  LaunchType,
  showHUD,
} from "@raycast/api";
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

function loadSavedHotkeysData(): HotkeysData | null {
  const userJsonPath = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "RaycastHotkeysMap",
    "hotkeys.json",
  );
  if (!fs.existsSync(userJsonPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(userJsonPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<HotkeysData>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.groups ||
      !Array.isArray(parsed.hotkeys)
    ) {
      return null;
    }
    return {
      groups: parsed.groups,
      hotkeys: parsed.hotkeys,
      aliases: Array.isArray(parsed.aliases) ? parsed.aliases : [],
    };
  } catch {
    return null;
  }
}

export default function Command() {
  const iconPath = path.join(environment.assetsPath, "app-icon.png");
  const data = loadSavedHotkeysData();
  const activeHotkeys = data
    ? data.hotkeys.filter((h) => !h.cleared && h.key)
    : [];

  async function openMap() {
    try {
      await launchCommand({
        name: "open-hotkeys-map",
        type: LaunchType.UserInitiated,
      });
    } catch {
      await showHUD("Failed to open Hotkeys Map");
    }
  }

  return (
    <MenuBarExtra icon={{ source: iconPath }} tooltip="Raycast Hotkeys Map">
      {!data ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Open Hotkeys Map to sync your hotkeys"
            icon={Icon.AppWindow}
            onAction={openMap}
          />
        </MenuBarExtra.Section>
      ) : (
        <>
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
        </>
      )}
    </MenuBarExtra>
  );
}
