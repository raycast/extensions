import { TimeWindow } from "@/common/utils/date-utils";
import { OnCallEvent } from "@/domain/on-call-event";
import { MonthBlock } from "@/ui/schedule/components/month-view/month-block";
import { SummaryBlock } from "@/ui/schedule/components/month-view/summary-block";
import { OnCallUserPill } from "@/ui/schedule/components/on-call-user-pill";
import { OnCallUser } from "@/domain/user";
import { computeOnCallSummary } from "@/domain/on-call-summary";
import { cn } from "@/lib/utils";
import { renderToSvg } from "@/ui/svg-renderer";
import { buildCalendarMonths } from "@/domain/calendar-month";

type MonthViewProps = {
  events: OnCallEvent[];
  timeWindow: TimeWindow;
  onCallUser?: OnCallUser;
};

export async function buildMonthViewSvg(props: MonthViewProps): Promise<string> {
  return renderToSvg(<MonthScheduleView {...props} />);
}

function MonthScheduleView({ events, timeWindow, onCallUser }: MonthViewProps) {
  const backgroundColor = onCallUser ? "" : "bg-dark";
  const allCalendarMonths = buildCalendarMonths(timeWindow, events);

  return (
    <div tw={cn("flex flex-col w-[1160px]", backgroundColor)}>
      {onCallUser && <OnCallUserPill name={onCallUser.name} color={onCallUser.color} />}
      {allCalendarMonths.map(({ yearMonth, weeks }) => {
        const { year, month } = yearMonth;
        const onCallSummary = computeOnCallSummary({ year, month, events });

        return (
          <div key={`${year}-${month}`} tw="flex flex-col w-[1160px]">
            <MonthBlock
              weeks={weeks}
              yearMonth={yearMonth}
              backgroundColor={backgroundColor}
              showTodayMarker={Boolean(onCallUser)}
              showWeekendStripes={Boolean(onCallUser)}
            />
            <SummaryBlock year={year} month={month} summary={onCallSummary} backgroundColor={backgroundColor} />
          </div>
        );
      })}
    </div>
  );
}
