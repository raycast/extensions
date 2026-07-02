import { OnCallEvent } from "@/domain/on-call-event";
import { OnCallUser } from "@/domain/user";
import { Optional } from "@/common/utils/optional-utils";
import { TimeRange } from "@/domain/time-range";
import { toSvgDataUri } from "@/common/utils/svg-utils";
import { buildWeekViewSvg } from "@/ui/schedule/components/week-view/week-schedule";
import { buildMonthViewSvg } from "@/ui/schedule/components/month-view/month-schedule";
import { buildScheduleSkeletonSvg } from "@/ui/schedule/skeleton/schedule-skeleton";
import { TimeWindow } from "@/common/utils/date-utils";

type ScheduleData = {
  events: OnCallEvent[];
  onCallUser: Optional<OnCallUser>;
  timeWindow: TimeWindow;
  timeRange: TimeRange;
  isLoading: boolean;
};

export async function renderSchedule(scheduleData: ScheduleData): Promise<string> {
  const { events, onCallUser, timeWindow, timeRange, isLoading } = scheduleData;
  if (isLoading) return `![schedule](${toSvgDataUri(await buildScheduleSkeletonSvg())})`;

  const svg =
    timeRange === TimeRange.WEEK
      ? await buildWeekViewSvg({ events, timeWindow, onCallUser })
      : await buildMonthViewSvg({ events, timeWindow, onCallUser });

  return `![schedule](${toSvgDataUri(svg)})`;
}
