import { clampYear, decadePage, decadeStart, MAX_YEAR, MIN_YEAR, yearRowId } from "../lib/calendar";
import { renderPickerSvg } from "../lib/picker-image";
import { PickerView } from "./picker-view";

interface Props {
  initialYear: number;
  today: Date;
  /** Called with the chosen year; the caller decides where to navigate next. */
  onPick: (year: number) => void;
}

/** Decade page of years. Moving past the decade turns the page, like the day calendar. */
export function YearView({ initialYear, today, onPick }: Props) {
  return (
    <PickerView<number>
      initial={initialYear}
      current={today.getFullYear()}
      noun="Year"
      normalize={clampYear}
      step={(year, delta) => year + delta}
      rowOf={yearRowId}
      idOf={String}
      renderImage={(selected, dark) => {
        const start = decadeStart(selected);
        return renderPickerSvg(
          `${start} – ${start + 9}`,
          decadePage(selected).map((year) => ({
            label: String(year),
            isSelected: year === selected,
            isCurrent: year === today.getFullYear(),
            // Years outside the supported range are shown faded and cannot be selected.
            isOutside: decadeStart(year) !== start || year < MIN_YEAR || year > MAX_YEAR,
          })),
          dark,
        );
      }}
      onPick={onPick}
    />
  );
}
