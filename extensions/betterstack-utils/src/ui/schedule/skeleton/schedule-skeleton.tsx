import { renderToSvg } from "@/ui/svg-renderer";
import { rangeOf } from "@/common/utils/collection-utils";
import { Colors, toRgba } from "@/common/colors";

const DAYS_IN_WEEK = 7;

export async function buildScheduleSkeletonSvg(): Promise<string> {
  return renderToSvg(<ScheduleSkeleton />);
}

function ScheduleSkeleton() {
  return (
    <div tw="flex flex-col w-[1160px]">
      <div tw="flex flex-col relative w-[1160px] rounded-[10px] mt-[50px]">
        <div tw={`flex absolute inset-0 rounded-[10px] bg-[${toRgba(Colors.SKELETON, 0.2)}]`} />
        <div tw="flex h-[44px]">
          <div tw="flex absolute left-[500px] top-[13px] w-[160px] h-[18px] bg-skeleton rounded-[4px]" />
        </div>
        {rangeOf(5).map((weekIndex) => (
          <WeekRowSkeleton key={weekIndex} />
        ))}
      </div>
    </div>
  );
}

function WeekRowSkeleton() {
  return (
    <div tw="flex flex-col w-[1160px] h-[82px]">
      <div tw="flex h-[30px]">
        {rangeOf(DAYS_IN_WEEK).map((dayIndex) => (
          <DayColumnSkeleton key={dayIndex} />
        ))}
      </div>
      <div tw="h-px bg-skeleton" />
      <div tw="flex-1 flex items-start px-[3px]">
        <div tw="w-full h-[42px] bg-skeleton rounded-[6px]" />
      </div>
    </div>
  );
}

function DayColumnSkeleton() {
  return (
    <div tw="flex flex-1 justify-center items-center border-l border-skeleton">
      <div tw="w-[39px] h-[15px] bg-skeleton rounded-[2px]" />
    </div>
  );
}
