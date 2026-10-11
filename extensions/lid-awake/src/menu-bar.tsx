import {
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { PRESETS, disable, durationLabel, enable, enforce, getStatus } from "./lib/session";
import { autoOffMessage, batteryTitle, menuBarTitles, turnOnMessage } from "./lib/labels";

async function loadState() {
  try {
    const reason = await enforce();
    if (reason) {
      const { batteryThreshold } = getPreferenceValues<Preferences.MenuBar>();
      await showHUD(autoOffMessage(reason, batteryThreshold)).catch(() => undefined);
    }
  } catch {
    await showHUD("Lid Awake couldn't turn off automatically. Run Set up Lid Awake.").catch(() => undefined);
  }
  return getStatus();
}

export default function Command() {
  const { data: status, isLoading, revalidate } = usePromise(loadState);

  const on = status?.on ?? false;
  const now = Date.now();
  const { statusTitle, title } = menuBarTitles(status, now);

  async function turnOn(minutes: number | null) {
    try {
      await enable(minutes);
      await showHUD(turnOnMessage(minutes));
    } catch (error) {
      await showFailureToast(error, { title: "Could not turn on Lid Awake" });
    }
    revalidate();
  }

  async function turnOff() {
    try {
      await disable();
      await showHUD("Lid Awake off, your Mac can sleep normally");
    } catch (error) {
      await showFailureToast(error, { title: "Could not turn off Lid Awake" });
    }
    revalidate();
  }

  return (
    <MenuBarExtra
      icon={on ? { source: Icon.Bolt, tintColor: Color.Green } : { source: Icon.BoltDisabled }}
      title={title}
      tooltip="Lid Awake"
      isLoading={isLoading}
    >
      <MenuBarExtra.Item title={statusTitle} icon={on ? Icon.Bolt : Icon.BoltDisabled} />
      <MenuBarExtra.Item title={batteryTitle(status?.battery)} icon={Icon.Battery} />
      {on && (
        <>
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item title="Turn Off" icon={Icon.Power} onAction={turnOff} />
        </>
      )}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Submenu title="Keep Awake For" icon={Icon.Clock}>
        {PRESETS.map((minutes) => (
          <MenuBarExtra.Item key={String(minutes)} title={durationLabel(minutes)} onAction={() => turnOn(minutes)} />
        ))}
      </MenuBarExtra.Submenu>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Set up…"
          icon={Icon.Gear}
          onAction={() => launchCommand({ name: "setup", type: LaunchType.UserInitiated }).catch(() => undefined)}
        />
        <MenuBarExtra.Item title="Preferences…" icon={Icon.Cog} onAction={() => openExtensionPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
