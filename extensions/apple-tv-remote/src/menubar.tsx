import { Icon, LaunchType, MenuBarExtra, launchCommand } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { loadDevice } from "./lib/pairing";
import { ActionId } from "./lib/actions";
import { loadCachedApps } from "./lib/apps";

/**
 * Menu-bar remote. Clicking an item closes the menu and Raycast unloads this
 * command immediately, which would kill an in-flight Companion handshake. So
 * every action is delegated to a background launch of the `ask` command,
 * which gets its own process lifetime and completes reliably.
 */

// launchCommand throws if the target command is missing or the user has
// disabled it. Swallowing that made every item here fail in total silence.
function launch(name: string, type: LaunchType, args?: { query: string }) {
  void launchCommand({ name, type, arguments: args }).catch((error) =>
    showFailureToast(error, { title: "Couldn't Run That Command" }),
  );
}

const fire = (query: ActionId | `open ${string}`) => () => launch("ask", LaunchType.Background, { query });

export default function Command() {
  const { data: device, isLoading } = usePromise(loadDevice);

  const topApps = Object.entries(loadCachedApps() ?? {}).slice(0, 12);

  return (
    <MenuBarExtra
      icon={{ source: { light: "menubar-remote.svg", dark: "menubar-remote@dark.svg" } }}
      isLoading={isLoading}
      tooltip={device ? `Apple TV: ${device.name}` : "Apple TV Remote"}
    >
      <MenuBarExtra.Item
        title={device ? "Open Full Remote" : "Set up Apple TV"}
        subtitle={device?.name}
        icon={Icon.GameController}
        onAction={() => launch(device ? "remote" : "setup", LaunchType.UserInitiated)}
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
          onAction={fire("menu")}
          alternate={
            <MenuBarExtra.Item title="App Switcher" icon={Icon.AppWindowGrid2x2} onAction={fire("app_switcher")} />
          }
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Playback">
        <MenuBarExtra.Item
          title="Play/Pause"
          icon={Icon.PlayFilled}
          onAction={fire("play_pause")}
          alternate={<MenuBarExtra.Item title="Control Center" icon={Icon.Switch} onAction={fire("control_center")} />}
        />
        <MenuBarExtra.Item title="Skip Forward 10s" icon={Icon.Forward} onAction={fire("skip_forward")} />
        <MenuBarExtra.Item title="Skip Back 10s" icon={Icon.Rewind} onAction={fire("skip_backward")} />
      </MenuBarExtra.Section>

      {topApps.length > 0 && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Submenu title="Open App" icon={Icon.AppWindow}>
            {topApps.map(([bundleId, name]) => (
              <MenuBarExtra.Item key={bundleId} title={name} onAction={fire(`open ${bundleId}`)} />
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
