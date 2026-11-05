import {
  Color,
  getPreferenceValues,
  Icon,
  LaunchType,
  launchCommand,
  MenuBarExtra,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { PRESETS, disable, durationLabel, enable, enforce, getStatus } from "./lib/session";
import { getRecentDurations } from "./lib/recent";
import { autoOffMessage, batteryTitle, menuBarTitles, turnOnMessage } from "./lib/labels";
import { showCommandFailure } from "./lib/feedback";

// Runs every minute: disables Doorstopper when a timer ends, the battery is low, or the Mac restarted, then reads the status.
async function loadState() {
  try {
    const reason = await enforce();
    if (reason) {
      const { batteryThreshold } = getPreferenceValues<Preferences.Statusmenu>();
      await showHUD(autoOffMessage(reason, batteryThreshold)).catch(() => undefined);
    }
  } catch {
    await showHUD("Doorstopper couldn't disable itself. Run Set up Passwordless Doorstopper.").catch(() => undefined);
  }
  return getStatus();
}

const TIMED_PRESETS = PRESETS.filter((minutes): minutes is number => minutes !== null);

export default function Command() {
  const preferences = getPreferenceValues<Preferences.Statusmenu>();
  const { data: status, isLoading, revalidate } = usePromise(loadState);
  const { data: recent } = usePromise(getRecentDurations);

  const on = status?.on ?? false;
  const { statusTitle, title } = menuBarTitles(status, Date.now());

  async function turnOn(minutes: number | null) {
    try {
      await enable(minutes);
      await showHUD(turnOnMessage(minutes));
    } catch (error) {
      await showCommandFailure(error, "Failed to enable Doorstopper");
    }
    revalidate();
  }

  async function turnOff() {
    try {
      await disable();
      if (preferences.hiddenWhenDisabled) {
        await showHUD("Doorstopper is now disabled");
      }
    } catch (error) {
      await showCommandFailure(error, "Failed to disable Doorstopper");
    }
    revalidate();
  }

  // While hidden, the command still runs its timer and battery checks; it only renders nothing once they finish.
  if (preferences.icon === "" || (preferences.hiddenWhenDisabled && !on)) {
    return isLoading ? <MenuBarExtra isLoading /> : null;
  }

  return (
    <MenuBarExtra
      isLoading={isLoading}
      title={title}
      icon={{ source: `${preferences.icon}-${on ? "open" : "closed"}.svg`, tintColor: Color.PrimaryText }}
    >
      <MenuBarExtra.Section title={statusTitle} />
      <MenuBarExtra.Item title={on ? "Disable" : "Enable"} onAction={() => (on ? turnOff() : turnOn(null))} />
      <MenuBarExtra.Submenu title="Enable For" icon={Icon.Clock}>
        {TIMED_PRESETS.map((minutes) => (
          <MenuBarExtra.Item key={String(minutes)} title={durationLabel(minutes)} onAction={() => turnOn(minutes)} />
        ))}
        {recent && recent.length > 0 && (
          <MenuBarExtra.Section>
            {recent.map((minutes) => (
              <MenuBarExtra.Item
                key={`recent-${minutes}`}
                title={durationLabel(minutes)}
                onAction={() => turnOn(minutes)}
              />
            ))}
          </MenuBarExtra.Section>
        )}
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Custom Duration…"
            icon={Icon.Pencil}
            onAction={() =>
              launchCommand({ name: "enable-for", type: LaunchType.UserInitiated }).catch(() => undefined)
            }
          />
        </MenuBarExtra.Section>
      </MenuBarExtra.Submenu>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={batteryTitle(status?.battery)} icon={Icon.Battery} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Set up Passwordless…"
          icon={Icon.Lock}
          onAction={() => launchCommand({ name: "setup", type: LaunchType.UserInitiated }).catch(() => undefined)}
        />
        <MenuBarExtra.Item title="Preferences…" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
