import { Action, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { formatRelative, ltrName } from "./format";
import { PrayerSlot } from "./prayers";
import { Settings } from "./settings";
import { clockStatus, MARK_TITLES, markOptions, PrayerStatusValue, STATUS_LABELS } from "./status";
import { NOT_STARTED_GREY, STATUS_COLORS, statusIcon } from "./status-icons";
import { PrayerRecord, saveHistory, setStatus } from "./tracker";

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
    return { tag: { value: `Preferred time over · ends ${formatRelative(slot.end, now)}`, color: Color.Orange } };
  }
  if (now < slot.end) return { tag: { value: `Ends ${formatRelative(slot.end, now)}`, color: Color.Blue } };
  if (!record) return { tag: { value: "No reminder", color: NOT_STARTED_GREY } };
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
  const mark = (status: PrayerStatusValue | undefined) =>
    runUpdate(
      `${name} ${status ? `marked ${STATUS_LABELS[status].toLowerCase()}` : "unmarked"}`,
      () => setStatus(slot, settings, status),
      reload,
    );
  return (
    <>
      {/* Default: the clock decides on time, late or made up, read when clicked. */}
      {!prayed && (
        <Action
          title="Mark as Prayed"
          icon={statusIcon(clockStatus(slot, now))}
          onAction={() => mark(clockStatus(slot, new Date()))}
        />
      )}
      {/* An unmarked prayer shows as missed once it ends; Mark Missed stays offered until that is written down. */}
      {markOptions(slot, record?.saved ?? prayed, now).map((status) => (
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

/**
 * "Save History": a dry run first, then a confirmation showing what will be written, then the write.
 *
 * @param settings - Settings.
 * @param reload - Called after saving.
 * @returns Action, or null without Apple Reminders.
 */
export function saveHistoryAction(settings: Settings, reload: () => void) {
  if (!settings.reminders.enabled) return null;
  const run = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Checking history…" });
    try {
      const found = await saveHistory(settings, false);
      toast.hide();
      if (found.entries.length === 0) {
        await showToast({ style: Toast.Style.Success, title: "History already saved" });
        return;
      }
      const counts = (Object.entries(found.byStatus) as [keyof typeof STATUS_LABELS, number][])
        .map(([status, n]) => `${n} ${STATUS_LABELS[status].toLowerCase()}`)
        .join(", ");
      const ok = await confirmAlert({
        title: `Save ${found.entries.length} Past Prayers?`,
        message: `Writes each one's status into its reminder (${counts}), worked out from when it was ticked, so it no longer changes with settings. Prayers never ticked are left as they are.`,
        primaryAction: { title: "Save History", style: Alert.ActionStyle.Default },
      });
      if (!ok) return;
      await runUpdate("History saved", () => saveHistory(settings, true).then(() => undefined), reload);
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not check history";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  };
  return <Action title="Save History" icon={Icon.SaveDocument} onAction={run} />;
}
