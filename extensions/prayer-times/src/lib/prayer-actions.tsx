import { Action, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { formatRelative, ltrName } from "./format";
import { PrayerSlot } from "./prayers";
import { Settings } from "./settings";
import { clockStatus, MARK_TITLES, markOptions, PrayedStatus, STATUS_LABELS } from "./status";
import { STATUS_COLORS, statusIcon } from "./status-icons";
import { PrayerRecord, setStatus } from "./tracker";

/**
 * Status accessory for a prayer row: its status once prayed, otherwise when it starts or ends.
 *
 * @param slot - Prayer slot.
 * @param record - Its reminder record, if any.
 * @param now - Current instant.
 * @returns Accessory.
 */
export function statusAccessory(slot: PrayerSlot, record: PrayerRecord | undefined, now: Date): List.Item.Accessory {
  if (record?.completed && record.status) {
    return { tag: { value: STATUS_LABELS[record.status], color: STATUS_COLORS[record.status] } };
  }
  if (now < slot.start) return { text: formatRelative(slot.start, now), icon: Icon.Clock };
  if (slot.preferredEnd && now >= slot.preferredEnd && now < slot.end) {
    return { tag: { value: `Disliked · ends ${formatRelative(slot.end, now)}`, color: Color.Orange } };
  }
  if (now < slot.end) return { tag: { value: `Ends ${formatRelative(slot.end, now)}`, color: Color.Blue } };
  if (!record) return { tag: { value: "No reminder", color: Color.SecondaryText } };
  return { tag: { value: STATUS_LABELS.missed, color: STATUS_COLORS.missed } };
}

/**
 * Run a change with a progress toast, then reload.
 *
 * @param done - Toast title on success.
 * @param change - The change.
 * @param reload - Called afterwards, whether it worked or not.
 */
export async function runUpdate(done: string, change: () => Promise<void>, reload: () => void): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving…" });
  try {
    await change();
    toast.style = Toast.Style.Success;
    toast.title = done;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not update";
    toast.message = err instanceof Error ? err.message : String(err);
  }
  reload();
}

/**
 * Mark, change-status and unmark actions for one prayer; nothing for prayers that haven't started.
 *
 * @param slot - Prayer slot.
 * @param record - Its reminder record, if any.
 * @param settings - Settings.
 * @param now - Current instant.
 * @param reload - Called after each change.
 * @returns Actions, or null.
 */
export function prayerActions(
  slot: PrayerSlot,
  record: PrayerRecord | undefined,
  settings: Settings,
  now: Date,
  reload: () => void,
) {
  if (slot.start > now) return null;
  const name = ltrName(slot.name);
  const prayed = record?.completed ? record.status : undefined;
  const mark = (status: PrayedStatus | undefined) =>
    runUpdate(
      `${name} ${status ? `marked ${STATUS_LABELS[status].toLowerCase()}` : "unmarked"}`,
      () => setStatus(slot, settings, status),
      reload,
    );
  return (
    <>
      {/* Default: the clock decides on time, late or made up, read when clicked. */}
      {!prayed && (
        <Action title="Mark as Prayed" icon={Icon.CheckCircle} onAction={() => mark(clockStatus(slot, new Date()))} />
      )}
      {markOptions(slot, prayed, now).map((status) => (
        <Action
          key={status}
          title={`${prayed ? "Change to" : "Mark"} ${MARK_TITLES[status]}`}
          icon={statusIcon(status)}
          onAction={() => mark(status)}
        />
      ))}
      {prayed && <Action title="Unmark Prayed" icon={Icon.XMarkCircle} onAction={() => mark(undefined)} />}
    </>
  );
}
