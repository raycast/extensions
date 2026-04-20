import { Action, ActionPanel, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { updateSchedule, useSchedules } from "@api/cal.com";
import {
  formatDayRanges,
  formatOverrideDate,
  formatOverrideRange,
  formatOverrideWeekday,
  formatTimeZoneWithOffset,
  getDeviceTimeZone,
  rangesForDay,
  WEEKDAYS,
  withDayHoursReplaced,
  withOverrideRemoved,
} from "@/lib/schedule";
import { EditDayHours } from "@components/edit-day-hours";
import { EditOverride } from "@components/edit-override";
import { EditTimezone } from "@components/edit-timezone";
import { RenameSchedule } from "@components/rename-schedule";

interface ScheduleDetailProps {
  scheduleId: number;
}

export function ScheduleDetail({ scheduleId }: ScheduleDetailProps) {
  const { data: schedules, isLoading, mutate } = useSchedules();
  const schedule = schedules?.find((s) => s.id === scheduleId);

  if (!schedule) {
    // Either still loading the cache or the schedule was removed externally.
    return <List isLoading={isLoading} />;
  }

  const handleClearDay = async (day: (typeof WEEKDAYS)[number]) => {
    const availability = withDayHoursReplaced(schedule, day, []);
    const toast = await showToast({ style: Toast.Style.Animated, title: `Clearing ${day}` });
    try {
      await mutate(updateSchedule(schedule.id, { availability }), {
        optimisticUpdate: (schedules) => schedules?.map((s) => (s.id === schedule.id ? { ...s, availability } : s)),
      });
      toast.style = Toast.Style.Success;
      toast.title = `${day} cleared`;
    } catch (err) {
      await showFailureToast(err, { title: `Failed to clear ${day}` });
    }
  };

  const handleDeleteOverride = async (date: string) => {
    const confirmed = await confirmAlert({
      title: "Delete override?",
      message: formatOverrideDate(date),
      icon: { source: Icon.Trash, tintColor: Color.Red },
    });
    if (!confirmed) return;
    const overrides = withOverrideRemoved(schedule, date);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting override" });
    try {
      await mutate(updateSchedule(schedule.id, { overrides }), {
        optimisticUpdate: (schedules) => schedules?.map((s) => (s.id === schedule.id ? { ...s, overrides } : s)),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Override deleted";
    } catch (err) {
      await showFailureToast(err, { title: "Failed to delete override" });
    }
  };

  const handleSetAsDefault = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Setting as default" });
    try {
      await mutate(updateSchedule(schedule.id, { isDefault: true }), {
        optimisticUpdate: (schedules) => schedules?.map((s) => ({ ...s, isDefault: s.id === schedule.id })),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Default schedule updated";
    } catch (err) {
      await showFailureToast(err, { title: "Failed to set default" });
    }
  };

  const handleSetToDeviceTimezone = async () => {
    const timeZone = getDeviceTimeZone();
    const toast = await showToast({ style: Toast.Style.Animated, title: `Setting timezone to ${timeZone}` });
    try {
      await mutate(updateSchedule(schedule.id, { timeZone }), {
        optimisticUpdate: (schedules) => schedules?.map((s) => (s.id === schedule.id ? { ...s, timeZone } : s)),
      });
      toast.style = Toast.Style.Success;
      toast.title = `Updated to ${timeZone}`;
    } catch (err) {
      await showFailureToast(err, { title: "Failed to update timezone" });
    }
  };

  const addOverrideAction = (
    <Action.Push
      title="Add Override"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<EditOverride schedule={schedule} mutate={mutate} />}
    />
  );

  const openScheduleInBrowserAction = (
    <Action.OpenInBrowser
      title="Open Schedule in Browser"
      url={`https://app.cal.com/availability/${schedule.id}`}
      shortcut={{ modifiers: ["cmd"], key: "return" }}
    />
  );

  return (
    <List navigationTitle={schedule.name}>
      <List.Section title="Working Hours">
        {WEEKDAYS.map((day) => {
          const ranges = rangesForDay(schedule, day);
          return (
            <List.Item
              key={day}
              icon={Icon.Calendar}
              title={day}
              accessories={[{ text: formatDayRanges(ranges) }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Edit Hours"
                    icon={Icon.Pencil}
                    target={<EditDayHours schedule={schedule} day={day} mutate={mutate} />}
                  />
                  {openScheduleInBrowserAction}
                  {ranges.length > 0 && (
                    <Action
                      title="Clear Day"
                      icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => handleClearDay(day)}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Date Overrides">
        {schedule.overrides.map((o) => (
          <List.Item
            key={o.date}
            icon={Icon.Calendar}
            title={formatOverrideDate(o.date)}
            subtitle={formatOverrideWeekday(o.date)}
            accessories={[{ text: formatOverrideRange(o) }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Override"
                  icon={Icon.Pencil}
                  target={<EditOverride schedule={schedule} mutate={mutate} existingDate={o.date} />}
                />
                {openScheduleInBrowserAction}
                {addOverrideAction}
                <Action
                  title="Delete Override"
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDeleteOverride(o.date)}
                />
              </ActionPanel>
            }
          />
        ))}
        <List.Item
          icon={Icon.Plus}
          title="Add Override"
          actions={
            <ActionPanel>
              {addOverrideAction}
              {openScheduleInBrowserAction}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Settings">
        <List.Item
          icon={Icon.Globe}
          title="Timezone"
          accessories={[{ text: formatTimeZoneWithOffset(schedule.timeZone) }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Timezone"
                icon={Icon.Pencil}
                target={<EditTimezone schedule={schedule} mutate={mutate} />}
              />
              {schedule.timeZone !== getDeviceTimeZone() && (
                <Action
                  title="Set to Device Timezone"
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  onAction={handleSetToDeviceTimezone}
                />
              )}
              {openScheduleInBrowserAction}
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Star}
          title="Default schedule"
          accessories={[{ text: schedule.isDefault ? "Yes" : "No" }]}
          actions={
            <ActionPanel>
              {!schedule.isDefault && <Action title="Set as Default" icon={Icon.Star} onAction={handleSetAsDefault} />}
              {openScheduleInBrowserAction}
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Tag}
          title="Name"
          accessories={[{ text: schedule.name }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Rename"
                icon={Icon.Pencil}
                target={<RenameSchedule schedule={schedule} mutate={mutate} />}
              />
              {openScheduleInBrowserAction}
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
