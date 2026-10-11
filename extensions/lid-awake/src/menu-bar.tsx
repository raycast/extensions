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
import { AutoDisableReason, formatRemaining } from "./lib/parse";

function autoOffMessage(reason: AutoDisableReason): string {
  switch (reason) {
    case "restart":
      return "Lid Awake turned off: Mac restarted";
    case "timer":
      return "Lid Awake turned off: timer ended";
    case "battery": {
      const { batteryThreshold } = getPreferenceValues<{ batteryThreshold: string }>();
      return `Lid Awake turned off: battery below ${batteryThreshold}%`;
    }
  }
}

async function loadState() {
  try {
    const reason = await enforce();
    if (reason) {
      await showHUD(autoOffMessage(reason)).catch(() => undefined);
    }
  } catch {
    // Keep showing status even if enforcement fails this cycle.
  }
  return getStatus();
}

export default function Command() {
  const { data: status, isLoading, revalidate } = usePromise(loadState);

  const on = status?.on ?? false;
  const session = status?.session ?? null;
  const battery = status?.battery;
  const now = Date.now();

  async function turnOn(minutes: number | null) {
    try {
      await enable(minutes);
      await showHUD(
        minutes === null
          ? "Lid Awake on until you turn it off"
          : `Lid Awake on for ${durationLabel(minutes).toLowerCase()}`,
      );
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

  let statusTitle = "Off";
  let title: string | undefined;
  if (on) {
    if (session?.endsAt != null) {
      const remaining = session.endsAt - now;
      statusTitle = `On, ${formatRemaining(remaining)} left`;
      title = formatRemaining(remaining);
    } else {
      statusTitle = "On until you turn it off";
      title = "∞";
    }
  }

  let batteryTitle = "Battery status unknown";
  if (battery) {
    if (!battery.hasBattery) {
      batteryTitle = "No battery (desktop Mac)";
    } else if (battery.onAC) {
      batteryTitle = `Battery ${battery.percent ?? "?"}%, on AC power`;
    } else {
      batteryTitle = `Battery ${battery.percent ?? "?"}%, on battery power`;
    }
  }

  return (
    <MenuBarExtra
      icon={on ? { source: Icon.Bolt, tintColor: Color.Green } : { source: Icon.BoltDisabled }}
      title={title}
      tooltip="Lid Awake"
      isLoading={isLoading}
    >
      <MenuBarExtra.Item title={statusTitle} icon={on ? Icon.Bolt : Icon.BoltDisabled} />
      <MenuBarExtra.Item title={batteryTitle} icon={Icon.Battery} />
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
          title="Setup…"
          icon={Icon.Gear}
          onAction={() => launchCommand({ name: "setup", type: LaunchType.UserInitiated }).catch(() => undefined)}
        />
        <MenuBarExtra.Item title="Preferences…" icon={Icon.Cog} onAction={() => openExtensionPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
