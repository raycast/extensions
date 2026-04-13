import { Action, ActionPanel, Color, Icon, List, openCommandPreferences, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { CalSchedule, updateSchedule, useSchedules } from "@api/cal.com";
import { ScheduleDetail } from "@components/schedule-detail";
import { formatDayRanges, formatTimeZoneWithOffset, rangesForDay, WEEKDAYS } from "@/lib/schedule";

export default function ViewAvailability() {
  const { data: schedules, isLoading, error, mutate } = useSchedules();
  const [isShowingDetail, setIsShowingDetail] = useCachedState("availability-show-details", true);

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
                  {schedule.overrides.length > 0 && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Overrides" text={`${schedule.overrides.length}`} />
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push title="View Schedule" icon={Icon.Eye} target={<ScheduleDetail scheduleId={schedule.id} />} />
              <Action
                title={isShowingDetail ? "Hide Details" : "Show Details"}
                icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => setIsShowingDetail(!isShowingDetail)}
              />
              {!schedule.isDefault && (
                <Action title="Set as Default" icon={Icon.Star} onAction={() => handleSetAsDefault(schedule)} />
              )}
              <Action.OpenInBrowser
                title="Open Schedule in Browser"
                url={`https://app.cal.com/availability/${schedule.id}`}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
              />
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
