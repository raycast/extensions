import { launchCommand, LaunchType } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AlertKind, AlertWindows, headsUpDue } from "./state";
import { Settings } from "./settings";
import { PrayerSlot } from "./prayers";
import { formatRelative, formatTime, ltrName } from "./format";

/** Launch context passed to the prayer-alert command. */
export interface AlertContext {
  slotId: string;
  kind: AlertKind;
}

/**
 * Title and body text for an alert.
 *
 * @param slot - Prayer slot.
 * @param kind - Alert kind.
 * @param now - Current instant.
 * @param dueAt - When reminders are due; decides what a heads-up counts down to.
 * @returns Title and message lines.
 */
export function describeAlert(
  slot: PrayerSlot,
  kind: AlertKind,
  now: Date,
  dueAt: AlertWindows["dueAt"],
): { title: string; message: string } {
  const jamaat = slot.jamaat ? `Jamaat ${formatTime(slot.jamaat)}` : undefined;
  const ends = `Ends ${formatTime(slot.end)}`;
  switch (kind) {
    case "headsUp": {
      const due = headsUpDue(slot, dueAt);
      const what = due === slot.jamaat ? `${ltrName(slot.name)} jamaat` : ltrName(slot.name);
      return {
        title: `${what} ${formatRelative(due, now)}`,
        message: [`Starts ${formatTime(slot.start)}`, jamaat, ends].filter(Boolean).join(" · "),
      };
    }
    case "start":
      return {
        title: `${ltrName(slot.name)} has started`,
        message: [formatTime(slot.start), jamaat, ends].filter(Boolean).join(" · "),
      };
    case "jamaat":
      return {
        title: `${ltrName(slot.name)} jamaat ${slot.jamaat ? formatRelative(slot.jamaat, now) : ""}`.trim(),
        message: [jamaat, ends].filter(Boolean).join(" · "),
      };
    case "ending":
      return {
        title: `${ltrName(slot.name)} ends ${formatRelative(slot.end, now)}`,
        message: `Not marked prayed · ${ends}`,
      };
  }
}

function appleScriptString(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Post a macOS banner. Notch apps that mirror notifications (e.g. Vorssaint) pick it up too.
 *
 * @param title - Banner title.
 * @param message - Banner body.
 */
export async function postBanner(title: string, message: string): Promise<void> {
  const script = `display notification ${appleScriptString(message)} with title ${appleScriptString(title)} subtitle "Prayer Times" sound name "Glass"`;
  await promisify(execFile)("/usr/bin/osascript", ["-e", script]);
}

/**
 * Deliver one of the extension's own alerts: a macOS banner and/or the Raycast popup, as enabled.
 * Reminders alarms fire separately from the reminders themselves.
 *
 * @param slot - Prayer slot.
 * @param kind - Alert kind.
 * @param notify - Which of the extension's channels are on.
 * @param now - Current instant.
 * @param dueAt - When reminders are due.
 */
export async function deliverAlert(
  slot: PrayerSlot,
  kind: AlertKind,
  notify: Settings["notify"],
  now: Date,
  dueAt: AlertWindows["dueAt"],
): Promise<void> {
  if (notify.banner) {
    const { title, message } = describeAlert(slot, kind, now, dueAt);
    try {
      await postBanner(title, message);
    } catch (error) {
      console.error("banner failed", error);
    }
  }
  if (notify.popup) {
    try {
      const context: AlertContext = { slotId: slot.id, kind };
      await launchCommand({ name: "prayer-alert", type: LaunchType.UserInitiated, context });
    } catch (error) {
      console.error("popup failed", error);
    }
  }
}
