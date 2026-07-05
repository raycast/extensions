import { DayRange } from "@/domain/week-timeline";
import { rangeOf } from "@/common/utils/collection-utils";
import { Appearance, getSchedulePalette } from "@/common/colors";

interface GridProps {
  days: Date[];
  range: DayRange;
  appearance: Appearance;
}

export function Grid({ days, range, appearance }: GridProps) {
  const palette = getSchedulePalette(appearance);

  return (
    <div tw="flex absolute inset-0">
      <VerticalLines days={days} range={range} gridLine={palette.gridLine} />
      <HorizontalBorder days={days} range={range} position="top" gridLine={palette.gridLine} />
      <HorizontalBorder days={days} range={range} position="bottom" gridLine={palette.gridLine} />
    </div>
  );
}

function VerticalLines({ days, range, gridLine }: { days: Date[]; range: DayRange; gridLine: string }) {
  return (
    <div tw="flex absolute inset-0">
      {rangeOf(days.length).map((index) => {
        const inMonth = index >= range.firstDay && index <= range.lastDay;
        const previousInMonth = index - 1 >= range.firstDay && index - 1 <= range.lastDay;
        const drawLeftBorder = inMonth || previousInMonth;
        const isLastColumn = index === days.length - 1;

        return (
          <div key={index} tw="flex flex-1 relative h-full">
            {drawLeftBorder && <div tw={`flex absolute top-0 bottom-0 left-0 w-px bg-[${gridLine}]`} />}
            {inMonth && isLastColumn && <div tw={`flex absolute top-0 bottom-0 right-0 w-px bg-[${gridLine}]`} />}
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBorder(props: { days: Date[]; range: DayRange; position: "top" | "bottom"; gridLine: string }) {
  const { days, range, position, gridLine } = props;

  return (
    <div tw={`flex absolute ${position}-0 left-0 right-0`}>
      {days.map((_, index) => {
        const inMonth = index >= range.firstDay && index <= range.lastDay;

        return <div key={index} tw={inMonth ? `flex flex-1 h-px bg-[${gridLine}]` : "flex flex-1 h-px"} />;
      })}
    </div>
  );
}
