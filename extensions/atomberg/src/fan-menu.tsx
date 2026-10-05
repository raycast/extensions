import {
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  openExtensionPreferences,
  showHUD,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Command, Fan, SPEEDS, TIMERS, loadFans, sendCommand } from "./atomberg";

function clampSpeed(speed: number): number {
  return Math.min(Math.max(Math.round(speed) || 1, 1), SPEEDS.length);
}

export default function FanMenu() {
  const { data, isLoading, mutate, revalidate } = useCachedPromise(loadFans, [false], {
    initialData: [] as Fan[],
  });

  const fans = data ?? [];
  const running = fans.filter((fan) => fan.power).length;

  /**
   * Send a command and fold the result into the cached list, so the next time
   * the menu opens it shows the new state without another API call.
   */
  async function apply(fan: Fan, command: Command, changes: Partial<Fan>, hud: string) {
    try {
      await mutate(sendCommand(fan.device_id, command), {
        optimisticUpdate: (current) =>
          (current ?? []).map((item) => (item.device_id === fan.device_id ? { ...item, ...changes } : item)),
        rollbackOnError: true,
        shouldRevalidateAfter: false,
      });
      await showHUD(hud);
    } catch (error) {
      await showHUD(`✗ ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return (
    <MenuBarExtra
      icon={Icon.Wind}
      isLoading={isLoading}
      tooltip={fans.length === 0 ? "Atomberg" : `${running} of ${fans.length} running`}
    >
      {fans.length === 0 && !isLoading && <MenuBarExtra.Item title="No fans found" icon={Icon.Warning} />}

      {fans.map((fan) => {
        const speed = clampSpeed(fan.last_recorded_speed);
        return (
          <MenuBarExtra.Section key={fan.device_id} title={fan.name}>
            <MenuBarExtra.Item
              title={fan.power ? "Turn Off" : "Turn On"}
              icon={fan.power ? Icon.Plug : Icon.Power}
              onAction={() =>
                apply(
                  fan,
                  { power: !fan.power },
                  { power: !fan.power },
                  `${fan.name} ${fan.power ? "off" : `on · speed ${speed}`}`,
                )
              }
            />

            <MenuBarExtra.Submenu title={fan.power ? `Speed ${speed}` : "Speed"} icon={Icon.Gauge}>
              {SPEEDS.map((value) => (
                <MenuBarExtra.Item
                  key={value}
                  title={`Speed ${value}`}
                  icon={fan.power && value === speed ? Icon.CircleFilled : Icon.Circle}
                  onAction={() =>
                    // Setting a speed on a stopped fan starts it.
                    apply(
                      fan,
                      { speed: value },
                      { last_recorded_speed: value, power: true },
                      `${fan.name} · speed ${value}`,
                    )
                  }
                />
              ))}
            </MenuBarExtra.Submenu>

            <MenuBarExtra.Submenu title="More" icon={Icon.Ellipsis}>
              <MenuBarExtra.Item
                title={fan.sleep_mode ? "Turn Off Sleep Mode" : "Turn On Sleep Mode"}
                icon={Icon.Moon}
                onAction={() =>
                  apply(
                    fan,
                    { sleep: !fan.sleep_mode },
                    { sleep_mode: !fan.sleep_mode },
                    `Sleep mode ${fan.sleep_mode ? "off" : "on"}`,
                  )
                }
              />
              <MenuBarExtra.Item
                title={fan.led ? "Turn Off Light" : "Turn On Light"}
                icon={Icon.LightBulb}
                onAction={() => apply(fan, { led: !fan.led }, { led: !fan.led }, `Light ${fan.led ? "off" : "on"}`)}
              />
              <MenuBarExtra.Section title="Timer">
                {TIMERS.map((timer) => (
                  <MenuBarExtra.Item
                    key={timer.value}
                    title={timer.label}
                    icon={Icon.Clock}
                    onAction={() =>
                      apply(fan, { timer: timer.value }, { timer_hours: timer.hours }, `Timer: ${timer.label}`)
                    }
                  />
                ))}
              </MenuBarExtra.Section>
            </MenuBarExtra.Submenu>
          </MenuBarExtra.Section>
        );
      })}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => revalidate()}
        />
        <MenuBarExtra.Item
          title="Open Fan List"
          icon={Icon.AppWindowList}
          onAction={() => launchCommand({ name: "fans", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Settings…" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
