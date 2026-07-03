import { getCurrentWeekDays, TimeWindow } from "@/common/utils/date-utils";
import { OnCallEvent } from "@/domain/on-call-event";
import { OnCallUser } from "@/domain/user";
import { cn } from "@/lib/utils";
import { OnCallUserPill } from "@/ui/schedule/components/on-call-user-pill";
import { HourLabels } from "@/ui/schedule/components/week-view/hour-labels";
import { renderToSvg } from "@/ui/svg-renderer";
import { WeekBlock } from "@/ui/schedule/components/week-view/week-block";

interface WeekViewProps {
  events: OnCallEvent[];
  timeWindow: TimeWindow;
  onCallUser?: OnCallUser;
}

export async function buildWeekViewSvg(props: WeekViewProps): Promise<string> {
  return renderToSvg(<WeekScheduleView {...props} />);
}

function WeekScheduleView({ events, timeWindow, onCallUser }: WeekViewProps) {
  const days = getCurrentWeekDays(timeWindow.start);

  return (
    <div tw={cn("flex flex-col w-[1160px]", { "bg-dark": !onCallUser })}>
      {onCallUser && <OnCallUserPill name={onCallUser.name} color={onCallUser.color} />}
      <div tw="flex h-[500px] pt-6">
        <HourLabels />
        <WeekBlock days={days} events={events} />
      </div>
    </div>
  );
}
