import { AutoDisableReason, Battery, formatRemaining } from "./parse";
import { Status, durationLabel } from "./session";

// Pure display and decision helpers for the command files. They take their inputs as arguments, so tests can call them
// without Raycast or the system.

export function autoOffMessage(reason: AutoDisableReason, batteryThreshold: string): string {
  switch (reason) {
    case "restart":
      return "Doorstopper is now disabled: Mac restarted";
    case "timer":
      return "Doorstopper is now disabled: timer ended";
    case "battery":
      return `Doorstopper is now disabled: battery below ${batteryThreshold}%`;
  }
}

export function turnOnMessage(minutes: number | null): string {
  return minutes === null
    ? "Doorstopper is now enabled"
    : `Doorstopper is now enabled for ${durationLabel(minutes).toLowerCase()}`;
}

// The menu bar shows only the door icon, as Doorstopper always has, plus the time left while a timer runs.
export function menuBarTitles(
  status: Status | undefined,
  now: number,
): { statusTitle: string; title: string | undefined } {
  const on = status?.on ?? false;
  const session = status?.session ?? null;
  if (!on) {
    return { statusTitle: "Doorstopper is disabled", title: undefined };
  }
  if (session?.endsAt != null) {
    const remaining = formatRemaining(session.endsAt - now);
    return { statusTitle: `Doorstopper is enabled, ${remaining} left`, title: remaining };
  }
  return { statusTitle: "Doorstopper is enabled", title: undefined };
}

// Subtitle for the Doorstopper Status command, in its original "✔ Enabled" / "✖ Disabled" style.
export function statusSubtitle(status: Status, now: number): string {
  if (!status.on) {
    return "✖ Disabled";
  }
  return status.session?.endsAt != null
    ? `✔ Enabled, ${formatRemaining(status.session.endsAt - now)} left`
    : "✔ Enabled";
}

export function batteryTitle(battery: Battery | undefined): string {
  if (!battery) {
    return "Battery status unknown";
  }
  if (!battery.hasBattery) {
    return "No battery (desktop Mac)";
  }
  const percent = battery.percent ?? "?";
  return battery.onAC ? `Battery ${percent}%, on AC power` : `Battery ${percent}%, on battery power`;
}

export function startAccessoryTitle(status: Status | undefined, now: number): string {
  const on = status?.on ?? false;
  const session = status?.session ?? null;
  if (!on) {
    return "Disabled";
  }
  return session?.endsAt ? `Enabled, ${formatRemaining(session.endsAt - now)} left` : "Enabled until you disable it";
}

export function presetSubtitle(minutes: number | null, now: number): string {
  if (minutes === null) {
    return "Until you disable it";
  }
  const endsAt = new Date(now + minutes * 60_000);
  const time = endsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (endsAt.toDateString() === new Date(now).toDateString()) {
    return `Until ${time}`;
  }
  // A typed duration can end on a later day, so name the day too.
  const day = endsAt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  return `Until ${day}, ${time}`;
}

export function isUserCancelled(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  // AuthenticationCanceledError comes from the Touch ID path in sudoSupport.ts.
  if (error instanceof Error && error.name === "AuthenticationCanceledError") {
    return true;
  }
  return message.includes("-128") || message.includes("User canceled");
}
