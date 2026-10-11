import { AutoDisableReason, Battery, formatRemaining } from "./parse";
import { Status, durationLabel } from "./session";

// Pure display and decision helpers for the command files. They take their inputs as arguments, so tests can call them
// without Raycast or the system.

export function autoOffMessage(reason: AutoDisableReason, batteryThreshold: string): string {
  switch (reason) {
    case "restart":
      return "Lid Awake turned off: Mac restarted";
    case "timer":
      return "Lid Awake turned off: timer ended";
    case "battery":
      return `Lid Awake turned off: battery below ${batteryThreshold}%`;
  }
}

export function turnOnMessage(minutes: number | null): string {
  return minutes === null
    ? "Lid Awake on until you turn it off"
    : `Lid Awake on for ${durationLabel(minutes).toLowerCase()}`;
}

export function menuBarTitles(
  status: Status | undefined,
  now: number,
): { statusTitle: string; title: string | undefined } {
  const on = status?.on ?? false;
  const session = status?.session ?? null;
  if (!on) {
    return { statusTitle: "Off", title: undefined };
  }
  if (session?.endsAt != null) {
    const remaining = formatRemaining(session.endsAt - now);
    return { statusTitle: `On, ${remaining} left`, title: remaining };
  }
  return { statusTitle: "On until you turn it off", title: "∞" };
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
    return "Off";
  }
  return session?.endsAt ? `On, ${formatRemaining(session.endsAt - now)} left` : "On until you turn it off";
}

export function presetSubtitle(minutes: number | null, now: number): string {
  if (minutes === null) {
    return "Until you turn it off";
  }
  const endsAt = new Date(now + minutes * 60_000);
  return `Until ${endsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export function isUserCancelled(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("-128") || message.includes("User canceled");
}
