import { Action, Icon, useNavigation } from "@raycast/api";
import { addMonths, format, isSameMonth, startOfMonth } from "date-fns";
import { clampDate, monthRowId, monthsOfYear, toMonthId } from "../lib/calendar";
import { LanguageConfig } from "../lib/locales";
import { renderPickerSvg } from "../lib/picker-image";
import { GO_TO_YEAR } from "../lib/shortcuts";
import { PickerView } from "./picker-view";
import { YearView } from "./year-view";

interface Props {
  initial: Date;
  today: Date;
  language: LanguageConfig;
  /** Called with the first day of the chosen month; the caller decides where to navigate next. */
  onPick: (month: Date) => void;
}

/** Twelve months of one year. Moving past December or January turns the page to the next or previous year. */
export function MonthView({ initial, today, language, onPick }: Props) {
  const { push, pop } = useNavigation();
  const options = { locale: language.locale };

  return (
    <PickerView<Date>
      initial={startOfMonth(initial)}
      current={startOfMonth(today)}
      noun="Month"
      normalize={(month) => startOfMonth(clampDate(month))}
      step={addMonths}
      rowOf={monthRowId}
      idOf={toMonthId}
      renderImage={(selected, dark) =>
        renderPickerSvg(
          format(selected, language.yearTitleFormat, options),
          monthsOfYear(selected).map((month) => ({
            label: format(month, language.monthLabelFormat, options),
            isSelected: isSameMonth(month, selected),
            isCurrent: isSameMonth(month, today),
            isOutside: false,
          })),
          dark,
        )
      }
      onPick={onPick}
      jumpActions={(settle, select) => (
        <Action
          title="Go to Year…"
          icon={Icon.Calendar}
          shortcut={GO_TO_YEAR}
          onAction={() => {
            const selected = settle();
            push(
              <YearView
                initialYear={selected.getFullYear()}
                today={today}
                onPick={(year) => {
                  select(new Date(year, selected.getMonth(), 1));
                  pop();
                }}
              />,
            );
          }}
        />
      )}
    />
  );
}
