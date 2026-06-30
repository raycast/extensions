import { DayRange } from "@/domain/week-timeline";
import { rangeOf } from "@/common/utils/collection-utils";

interface GridProps {
  days: Date[];
  range: DayRange;
}

export function Grid({ days, range }: GridProps) {
  return (
    <div tw="flex absolute inset-0">
      <VerticalLines days={days} range={range} />
      <HorizontalBorder days={days} range={range} position="top" />
      <HorizontalBorder days={days} range={range} position="bottom" />
    </div>
  );
}

function VerticalLines({ days, range }: { days: Date[]; range: DayRange }) {
  return (
    <div tw="flex absolute inset-0">
      {rangeOf(days.length).map((index) => {
        const inMonth = index >= range.firstDay && index <= range.lastDay;
        const previousInMonth = index - 1 >= range.firstDay && index - 1 <= range.lastDay;
        const drawLeftBorder = inMonth || previousInMonth;
        const isLastColumn = index === days.length - 1;

        return (
          <div key={index} tw="flex flex-1 relative h-full">
            {drawLeftBorder && <div tw="flex absolute top-0 bottom-0 left-0 w-px bg-dim" style={{ opacity: 0.3 }} />}
            {inMonth && isLastColumn && (
              <div tw="flex absolute top-0 bottom-0 right-0 w-px bg-dim" style={{ opacity: 0.3 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBorder(props: { days: Date[]; range: DayRange; position: "top" | "bottom" }) {
  const { days, range, position } = props;

  return (
    <div tw={`flex absolute ${position}-0 left-0 right-0`}>
      {days.map((_, index) => {
        const inMonth = index >= range.firstDay && index <= range.lastDay;

        return (
          <div key={index} tw={inMonth ? "flex flex-1 h-px bg-dim" : "flex flex-1 h-px"} style={{ opacity: 0.3 }} />
        );
      })}
    </div>
  );
}
