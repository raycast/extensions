import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Detail,
  Icon,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { dayNavigationActions } from "./components/day-navigation-actions";
import { formatActions } from "./components/format-actions";
import { MonthView } from "./components/month-view";
import { YearView } from "./components/year-view";
import { clampDate, moveToMonth, moveToYear, toDayId, withTimeOf } from "./lib/calendar";
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
  // Every day carries the time the command opened; see withTimeOf.
  const [selected, updateSelected, settle] = useThrottledState(today, (date) => withTimeOf(clampDate(date), today));
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

  /** Formats the latest selection, including moves not drawn yet, for paste and copy. */
  function latestOutput(): string | undefined {
    const latest = formatDate(settle(), activeFormat.pattern, language.locale);
    return latest.ok ? latest.value : undefined;
  }

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
              {/* Not Action.Paste / Action.CopyToClipboard: their content is fixed when the frame is drawn. */}
              <Action
                title="Paste Date"
                icon={Icon.Clipboard}
                onAction={async () => {
                  const text = latestOutput();
                  if (text === undefined) return;
                  // Same order as the Raycast docs: paste first, then close the window.
                  await Clipboard.paste(text);
                  await closeMainWindow();
                }}
              />
              <Action
                title="Copy Date"
                icon={Icon.CopyClipboard}
                shortcut={COPY_DATE}
                onAction={async () => {
                  const text = latestOutput();
                  if (text === undefined) return;
                  await Clipboard.copy(text);
                  await showHUD("Copied to Clipboard");
                }}
              />
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
              onAction={() => push(monthView(settle(), 1))}
            />
            <Action
              title="Go to Year…"
              icon={Icon.Calendar}
              shortcut={GO_TO_YEAR}
              onAction={() => {
                const current = settle();
                push(
                  <YearView
                    initialYear={current.getFullYear()}
                    today={today}
                    // Choosing a year continues to that year's months; afterwards close both screens.
                    onPick={(year) => push(monthView(moveToYear(current, year), 2))}
                  />,
                );
              }}
            />
          </ActionPanel.Section>
          {dayNavigationActions(updateSelected, weekStartsOn)}
        </ActionPanel>
      }
    />
  );
}
