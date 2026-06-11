import { Icon, MenuBarExtra, open, Color } from "@raycast/api";
import { useAppData } from "./lib/hooks/useAppData";
import { getNextSchedule, getSchedulesForDay, getTodayName, formatTime } from "./lib/schedule-utils";

export default function MenuBar() {
  const { activeGroup, isLoading } = useAppData();
  const courses = activeGroup?.courses ?? [];
  const todayName = getTodayName();

  const nextUp = getNextSchedule(courses);
  const todaySchedules = getSchedulesForDay(courses, todayName);
  const noCoursesAtAll = courses.length === 0;
  const allDoneToday = !noCoursesAtAll && !nextUp && todaySchedules.length > 0;
  const noClassesToday = !noCoursesAtAll && todaySchedules.length === 0;

  const title = isLoading
    ? "Next Up"
    : nextUp
      ? `${nextUp.course.title} @ ${nextUp.slot.startTime}`
      : allDoneToday
        ? "All Done Today 🎉"
        : noClassesToday
          ? "No Classes Today"
          : "No More Classes";
  const icon = isLoading
    ? { source: Icon.Clock, tintColor: Color.Blue }
    : nextUp
      ? { source: Icon.Clock, tintColor: Color.Yellow }
      : { source: Icon.CheckCircle, tintColor: Color.Green };

  return (
    <MenuBarExtra icon={icon} title={isLoading ? "Next Up" : title} isLoading={isLoading} tooltip="Next Up">
      {nextUp && (
        <MenuBarExtra.Section title="Up Next">
          <MenuBarExtra.Item
            title={nextUp.course.title}
            subtitle={`${formatTime(nextUp.slot.startTime)} – ${formatTime(nextUp.slot.endTime)}`}
            icon={Icon.Clock}
            onAction={() => {
              if (nextUp.slot.meetingLink) open(nextUp.slot.meetingLink);
            }}
          />
          {nextUp.slot.room && <MenuBarExtra.Item title={`Room: ${nextUp.slot.room}`} icon={Icon.Building} />}
          {nextUp.slot.meetingLink && (
            <MenuBarExtra.Item title="Join Meeting" icon={Icon.Video} onAction={() => open(nextUp.slot.meetingLink!)} />
          )}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section title={`All of ${todayName}`}>
        {todaySchedules.length === 0 && <MenuBarExtra.Item title="No classes today" icon={Icon.CheckCircle} />}
        {todaySchedules.map((occ) => (
          <MenuBarExtra.Item
            key={`${occ.course.id}-${occ.slot.id}`}
            title={occ.course.title}
            subtitle={`${formatTime(occ.slot.startTime)} – ${formatTime(occ.slot.endTime)}`}
            icon={Icon.Circle}
            onAction={() => {
              if (occ.slot.meetingLink) open(occ.slot.meetingLink);
            }}
          />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Today"
          icon={Icon.Eye}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => open("raycast://extensions/adrianbonpin/next-up/what-s-next")}
        />
        <MenuBarExtra.Item
          title="Manage Schedules"
          icon={Icon.Gear}
          onAction={() => open("raycast://extensions/adrianbonpin/next-up/manage-schedules")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
