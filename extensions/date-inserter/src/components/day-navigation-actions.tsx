import { Action, ActionPanel, Icon } from "@raycast/api";
import { addDays } from "date-fns";
import { DAYS_PER_WEEK, shiftMonth, shiftYear, toMonthId, weekRowId, WeekStartsOn } from "../lib/calendar";
import { gridHold } from "../lib/grid-hold";
import { NEXT_MONTH, NEXT_YEAR, PREVIOUS_MONTH, PREVIOUS_YEAR } from "../lib/shortcuts";
import { HoldOptions } from "../lib/update-scheduler";
import { arrowActions } from "./arrow-actions";

type Update = (next: (current: Date) => Date, hold?: HoldOptions<Date>) => void;

/**
 * Navigation section of the day calendar. While an arrow key is held, the
 * calendar is only shown when the selection reaches a new week (left/right)
 * or a new month (any arrow); see UpdateScheduler.
 */
export function dayNavigationActions(update: Update, weekStartsOn: WeekStartsOn) {
  const rowOf = (date: Date) => weekRowId(date, weekStartsOn);
  return (
    <ActionPanel.Section title="Navigate">
      {arrowActions(
        DAYS_PER_WEEK,
        { left: "Previous Day", right: "Next Day", up: "Previous Week", down: "Next Week" },
        (delta, key) => update((current) => addDays(current, delta), gridHold(key, rowOf, toMonthId)),
      )}
      <Action
        title="Previous Month"
        icon={Icon.ChevronLeft}
        shortcut={PREVIOUS_MONTH}
        onAction={() => update((current) => shiftMonth(current, -1))}
      />
      <Action
        title="Next Month"
        icon={Icon.ChevronRight}
        shortcut={NEXT_MONTH}
        onAction={() => update((current) => shiftMonth(current, 1))}
      />
      <Action
        title="Previous Year"
        icon={Icon.Rewind}
        shortcut={PREVIOUS_YEAR}
        onAction={() => update((current) => shiftYear(current, -1))}
      />
      <Action
        title="Next Year"
        icon={Icon.Forward}
        shortcut={NEXT_YEAR}
        onAction={() => update((current) => shiftYear(current, 1))}
      />
    </ActionPanel.Section>
  );
}
