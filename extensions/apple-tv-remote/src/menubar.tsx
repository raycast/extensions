import { Icon, LaunchType, MenuBarExtra, launchCommand } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getSelectedDeviceOrNull } from "./lib/devices";
import { loadCachedApps } from "./lib/deep-links";

/**
 * Menu-bar remote. Clicking an item closes the menu and Raycast unloads this
 * command immediately, which would kill an in-flight Companion handshake. So
 * every action is delegated to a background launch of the `ask` command,
 * which gets its own process lifetime and completes reliably.
 */

const fire = (query: string) => () =>
  void launchCommand({ name: "ask", type: LaunchType.Background, arguments: { query } }).catch(() => {});

export default function Command() {
  const { data: device, isLoading } = usePromise(getSelectedDeviceOrNull);
  const { data: cachedApps } = usePromise(loadCachedApps);

  const topApps = cachedApps ? Object.entries(cachedApps.apps).slice(0, 12) : [];

  return (
    <MenuBarExtra
      icon={{ source: { light: "menubar-icon.png", dark: "menubar-icon@dark.png" } }}
      isLoading={isLoading}
      tooltip={device ? `Apple TV: ${device.name}` : "Apple TV Remote"}
    >
      <MenuBarExtra.Item
        title={device ? "Open Full Remote" : "Set up Apple TV"}
        subtitle={device?.name}
        icon={Icon.GameController}
        onAction={() =>
          void launchCommand({
            name: device ? "remote" : "setup",
            type: LaunchType.UserInitiated,
          }).catch(() => {})
        }
      />

      <MenuBarExtra.Section title="Navigate">
        <MenuBarExtra.Item title="Up" icon={Icon.ChevronUp} onAction={fire("up")} />
        <MenuBarExtra.Item title="Down" icon={Icon.ChevronDown} onAction={fire("down")} />
        <MenuBarExtra.Item title="Left" icon={Icon.ChevronLeft} onAction={fire("left")} />
        <MenuBarExtra.Item title="Right" icon={Icon.ChevronRight} onAction={fire("right")} />
        <MenuBarExtra.Item
          title="Select"
          icon={Icon.CircleFilled}
          onAction={fire("select")}
          alternate={<MenuBarExtra.Item title="Home" icon={Icon.House} onAction={fire("home")} />}
        />
        <MenuBarExtra.Item
          title="Back"
          icon={Icon.Undo}
          onAction={fire("back")}
          alternate={
            <MenuBarExtra.Item title="App Switcher" icon={Icon.AppWindowGrid2x2} onAction={fire("app switcher")} />
          }
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Playback">
        <MenuBarExtra.Item
          title="Play/Pause"
          icon={Icon.PlayFilled}
          onAction={fire("pause")}
          alternate={<MenuBarExtra.Item title="Control Center" icon={Icon.Switch} onAction={fire("control center")} />}
        />
        <MenuBarExtra.Item title="Skip Forward 10s" icon={Icon.Forward} onAction={fire("skip forward")} />
        <MenuBarExtra.Item title="Skip Back 10s" icon={Icon.Rewind} onAction={fire("skip back")} />
      </MenuBarExtra.Section>

      {topApps.length > 0 && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Submenu title="Open App" icon={Icon.AppWindow}>
            {topApps.map(([bundleId, name]) => (
              <MenuBarExtra.Item key={bundleId} title={name} onAction={fire(`open ${name.toLowerCase()}`)} />
            ))}
          </MenuBarExtra.Submenu>
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Sleep"
          icon={Icon.Moon}
          onAction={fire("sleep")}
          alternate={<MenuBarExtra.Item title="Wake" icon={Icon.Sun} onAction={fire("wake")} />}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
