import { addDays, getTimeline, PrayerSlot, toDateKey } from "./prayers";
import { buildSettings, Settings } from "./settings";
import { locateCurrent } from "./helper";
import { distanceKm, locationFromFix, readLocatedFor, writeLocatedFor, writeLocation } from "./location";
import { currentSlot, dueAlerts, nextSlot, passedAlertIds } from "./state";
import { deliverAlert } from "./alerts";
import { addFired, readFired, readSnoozes, writeSnoozes } from "./storage";
import { loadHistory, prayedSet, syncReminders } from "./tracker";
import { formatRelative, formatTime, ltrName } from "./format";

/** In current-location mode, take a fix this long before each prayer starts. */
const LOCATE_LEAD = 30 * 60_000;
/** Moves smaller than this keep the old coordinates, so GPS jitter doesn't rewrite reminders. */
const MOVE_THRESHOLD_KM = 5;

/**
 * In current-location mode, refresh the location once per prayer, within 30 minutes of its start.
 * A move of 5 km or more replaces the saved coordinates, which changes the plan and moves the reminders.
 *
 * @param settings - Settings.
 * @param now - Current instant.
 * @returns Settings for the (possibly new) location.
 */
export async function refreshLocationIfDue(settings: Settings, now: Date): Promise<Settings> {
  if (settings.location.mode !== "current") return settings;
  const next = nextSlot(getTimeline(now, settings.schedule), now);
  if (!next || next.start.getTime() - now.getTime() > LOCATE_LEAD) return settings;
  if ((await readLocatedFor()) === next.id) return settings;
  await writeLocatedFor(next.id);

  let fresh;
  try {
    fresh = locationFromFix(await locateCurrent(), now);
  } catch (error) {
    console.error("location refresh failed", error);
    return settings;
  }
  if (distanceKm(settings.location, fresh) < MOVE_THRESHOLD_KM) {
    await writeLocation({ ...settings.location, updatedAt: fresh.updatedAt });
    return settings;
  }
  await writeLocation(fresh);
  return buildSettings(fresh);
}

/** What one engine tick did. */
export interface TickResult {
  /** Settings after any location refresh. */
  settings: Settings;
  slots: PrayerSlot[];
  prayed: Set<string>;
  popups: number;
  changedReminders: number;
  syncError?: string;
}

/**
 * One background tick: refresh the location if due, keep reminders filled ahead, read prayed state,
 * and deliver the extension's own due or snoozed alerts (banner and/or popup).
 *
 * @param initial - Settings as loaded.
 * @param now - Current instant.
 * @returns Tick summary.
 */
export async function tick(initial: Settings, now = new Date()): Promise<TickResult> {
  const settings = await refreshLocationIfDue(initial, now);
  const slots = getTimeline(now, settings.schedule);

  let changedReminders = 0;
  let syncError: string | undefined;
  try {
    const outcome = await syncReminders(settings, now);
    changedReminders = outcome.created + outcome.updated;
  } catch (error) {
    syncError = error instanceof Error ? error.message : String(error);
  }

  let prayed = new Set<string>();
  try {
    prayed = prayedSet(await loadHistory(settings, addDays(now, -1), now));
  } catch (error) {
    syncError ??= error instanceof Error ? error.message : String(error);
  }

  let popups = 0;
  if (settings.notify.banner || settings.notify.popup) {
    const snoozes = await readSnoozes();
    const keep = [];
    for (const entry of snoozes) {
      const slot = slots.find((s) => s.id === entry.slotId);
      if (!slot || prayed.has(slot.id) || now >= slot.end) continue;
      if (new Date(entry.until) <= now) {
        await deliverAlert(slot, entry.kind, settings.notify, now);
        popups++;
      } else {
        keep.push(entry);
      }
    }
    if (keep.length !== snoozes.length) await writeSnoozes(keep);

    const due = dueAlerts(slots, now, prayed, await readFired(), settings.windows);
    const firedNow: string[] = [];
    for (const alert of due) {
      await deliverAlert(alert.slot, alert.kind, settings.notify, now);
      popups++;
      firedNow.push(...passedAlertIds(alert.slot, now, settings.windows));
    }
    if (firedNow.length) await addFired(firedNow, toDateKey(addDays(now, -2)));
  }

  return { settings, slots, prayed, popups, changedReminders, syncError };
}

/**
 * Root search subtitle: the running prayer while unprayed, otherwise the next one.
 *
 * @param slots - Timeline slots.
 * @param prayed - Prayed slot ids.
 * @param now - Current instant.
 * @returns Subtitle text.
 */
export function subtitleFor(slots: PrayerSlot[], prayed: ReadonlySet<string>, now: Date): string {
  const running = currentSlot(slots, now);
  const next = nextSlot(slots, now);
  if (running && !prayed.has(running.id)) {
    const parts = [`${ltrName(running.name)} · ends ${formatRelative(running.end, now)}`];
    if (running.jamaat && running.jamaat > now) parts.push(`jamaat ${formatTime(running.jamaat)}`);
    return parts.join(" · ");
  }
  if (!next) return "";
  const parts = [`${ltrName(next.name)} ${formatTime(next.start)} · ${formatRelative(next.start, now)}`];
  if (next.jamaat) parts.push(`jamaat ${formatTime(next.jamaat)}`);
  return parts.join(" · ");
}
