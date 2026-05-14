import { Action, ActionPanel, Color, Icon, List, openCommandPreferences, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { CalSchedule, updateSchedule, useEventTypes, useSchedules } from "@api/cal.com";
import { ScheduleDetail } from "@components/schedule-detail";
import {
  formatDayRanges,
  formatOverrideDate,
  formatOverrideRange,
  formatOverrideWeekday,
  formatTimeZoneWithOffset,
  getDeviceTimeZone,
  rangesForDay,
  WEEKDAYS,
} from "@/lib/schedule";

// Today as YYYY-MM-DD in local time (matches the format Cal.com uses for override.date).
function todayLocalIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function ViewAvailability() {
  const { data: schedules, isLoading, error, mutate } = useSchedules();
  const { data: eventTypes } = useEventTypes();
  const [isShowingDetail, setIsShowingDetail] = useCachedState("availability-show-details", true);
  const today = todayLocalIso();

  const handleSetAsDefault = async (schedule: CalSchedule) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Setting as default" });
    try {
      await mutate(updateSchedule(schedule.id, { isDefault: true }), {
        optimisticUpdate: (list) => list?.map((s) => ({ ...s, isDefault: s.id === schedule.id })),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Default schedule updated";
    } catch (err) {
      await showFailureToast(err, { title: "Failed to set default" });
    }
  };

  const handleSetToDeviceTimezone = async (schedule: CalSchedule) => {
    const timeZone = getDeviceTimeZone();
    const toast = await showToast({ style: Toast.Style.Animated, title: `Setting timezone to ${timeZone}` });
    try {
      await mutate(updateSchedule(schedule.id, { timeZone }), {
        optimisticUpdate: (list) => list?.map((s) => (s.id === schedule.id ? { ...s, timeZone } : s)),
      });
      toast.style = Toast.Style.Success;
      toast.title = `Updated to ${timeZone}`;
    } catch (err) {
      await showFailureToast(err, { title: "Failed to update timezone" });
    }
  };

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
      {error && (
        <List.EmptyView
          title="Unable to load schedules"
          description="Check your API key"
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" onAction={openCommandPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      )}
      {schedules?.map((schedule) => (
        <List.Item
          key={schedule.id}
          icon={schedule.isDefault ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Calendar}
          title={schedule.name}
          accessories={
            isShowingDetail
              ? []
              : [
                  { text: formatTimeZoneWithOffset(schedule.timeZone) },
                  ...(schedule.isDefault ? [{ tag: { value: "Default", color: Color.Yellow } }] : []),
                ]
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Name" text={schedule.name} />
                  <List.Item.Detail.Metadata.Label
                    title="Timezone"
                    text={formatTimeZoneWithOffset(schedule.timeZone)}
                  />
                  <List.Item.Detail.Metadata.Label title="Default" text={schedule.isDefault ? "Yes" : "No"} />
                  <List.Item.Detail.Metadata.Separator />
                  {WEEKDAYS.map((day) => (
                    <List.Item.Detail.Metadata.Label
                      key={day}
                      title={day}
                      text={formatDayRanges(rangesForDay(schedule, day))}
                    />
                  ))}
                  {(() => {
                    const upcomingOverrides = schedule.overrides
                      .filter((o) => o.date >= today)
                      .sort((a, b) => a.date.localeCompare(b.date));
                    if (upcomingOverrides.length === 0) return null;
                    return (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        {upcomingOverrides.map((o) => (
                          <List.Item.Detail.Metadata.Label
                            key={o.date}
                            title={`${formatOverrideDate(o.date)} (${formatOverrideWeekday(o.date)})`}
                            text={formatOverrideRange(o)}
                          />
                        ))}
                      </>
                    );
                  })()}
                  {(() => {
                    const linked = (eventTypes ?? [])
                      .filter((et) => et.scheduleId === schedule.id || (schedule.isDefault && et.scheduleId === null))
                      .sort((a, b) => a.title.localeCompare(b.title));
                    if (linked.length === 0) return null;
                    return (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.TagList title="Used by">
                          {linked.map((et) => (
                            <List.Item.Detail.Metadata.TagList.Item key={et.id} text={et.title} />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      </>
                    );
                  })()}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push title="View Schedule" icon={Icon.Eye} target={<ScheduleDetail scheduleId={schedule.id} />} />
              <Action.OpenInBrowser
                title="Open Schedule in Browser"
                url={`https://app.cal.com/availability/${schedule.id}`}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
              />
              <Action
                title={isShowingDetail ? "Hide Details" : "Show Details"}
                icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => setIsShowingDetail(!isShowingDetail)}
              />
              {!schedule.isDefault && (
                <Action title="Set as Default" icon={Icon.Star} onAction={() => handleSetAsDefault(schedule)} />
              )}
              {schedule.timeZone !== getDeviceTimeZone() && (
                <Action
                  title="Set to Device Timezone"
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  onAction={() => handleSetToDeviceTimezone(schedule)}
                />
              )}
              <Action.OpenInBrowser
                title="Open All Availabilities in Browser"
                url="https://app.cal.com/availability"
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
