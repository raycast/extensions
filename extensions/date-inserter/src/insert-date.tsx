import { Action, ActionPanel, Detail, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { dayNavigationActions } from "./components/day-navigation-actions";
import { formatActions } from "./components/format-actions";
import { MonthView } from "./components/month-view";
import { YearView } from "./components/year-view";
import { clampDate, moveToMonth, moveToYear, toDayId } from "./lib/calendar";
import { renderCalendarSvg } from "./lib/calendar-image";
import { formatDate } from "./lib/date-format";
import { readSettings } from "./lib/settings";
import { COPY_DATE, GO_TO_MONTH, GO_TO_TODAY, GO_TO_YEAR } from "./lib/shortcuts";
import { useImageCache } from "./lib/use-image-cache";
import { useThrottledState } from "./lib/use-throttled-state";

const FORMAT_REFERENCE_URL = "https://date-fns.org/docs/format";

export default function Command() {
  const settings = useMemo(readSettings, []);
  const { formats, language, weekStartsOn, weekNumbering } = settings;
  const today = useMemo(() => new Date(), []);
  const [selected, updateSelected] = useThrottledState(today, clampDate);
  const [formatIndex, setFormatIndex] = useState(settings.initialFormatIndex);
  const { push, pop } = useNavigation();

  const activeFormat = formats[formatIndex];
  const result = formatDate(selected, activeFormat.pattern, language.locale);
  const formatError = result.ok ? undefined : result.error;

  const imageFor = useImageCache();
  // The image includes the output preview, so it also depends on the active format.
  const image = imageFor(`${toDayId(selected)}:${formatIndex}`, (dark) =>
    renderCalendarSvg({
      selected,
      today,
      weekStartsOn,
      weekNumbering,
      language,
      dark,
      output: result.ok ? { text: result.value, isError: false } : { text: "Invalid date format", isError: true },
    }),
  );

  // Explain an invalid format once, when it becomes active.
  useEffect(() => {
    if (formatError) {
      showToast({
        style: Toast.Style.Failure,
        title: `Invalid Date Format ${activeFormat.number}`,
        message: formatError,
      });
    }
  }, [activeFormat.number, activeFormat.pattern]);

  /** Opens the month view; `pops` is how many screens to close after a month is chosen. */
  function monthView(initial: Date, pops: number) {
    return (
      <MonthView
        initial={initial}
        today={today}
        language={language}
        onPick={(month) => {
          updateSelected((current) => moveToMonth(current, month));
          for (let i = 0; i < pops; i++) pop();
        }}
      />
    );
  }

  return (
    <Detail
      markdown={`![Calendar](${image})`}
      actions={
        <ActionPanel>
          {result.ok ? (
            <>
              <Action.Paste title="Paste Date" content={result.value} />
              <Action.CopyToClipboard title="Copy Date" content={result.value} shortcut={COPY_DATE} />
            </>
          ) : (
            <Action.OpenInBrowser title="Open Date Format Reference" url={FORMAT_REFERENCE_URL} />
          )}
          {formatActions(formats, formatIndex, setFormatIndex)}
          <ActionPanel.Section title="Jump">
            <Action
              title="Go to Today"
              icon={Icon.Undo}
              shortcut={GO_TO_TODAY}
              onAction={() => updateSelected(() => today)}
            />
            <Action
              title="Go to Month…"
              icon={Icon.Calendar}
              shortcut={GO_TO_MONTH}
              onAction={() => push(monthView(selected, 1))}
            />
            <Action
              title="Go to Year…"
              icon={Icon.Calendar}
              shortcut={GO_TO_YEAR}
              onAction={() =>
                push(
                  <YearView
                    initialYear={selected.getFullYear()}
                    today={today}
                    // Choosing a year continues to that year's months; afterwards close both screens.
                    onPick={(year) => push(monthView(moveToYear(selected, year), 2))}
                  />,
                )
              }
            />
          </ActionPanel.Section>
          {dayNavigationActions(updateSelected, weekStartsOn)}
        </ActionPanel>
      }
    />
  );
}
