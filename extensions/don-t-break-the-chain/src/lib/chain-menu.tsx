import {
  Icon,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  environment,
  launchCommand,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import {
  MonthKey,
  addMonths,
  buildWeeks,
  currentStreak,
  dayLetters,
  monthKeyOf,
  monthLabel,
  parseMonthKey,
} from "./month";
import { chainIndex, chainName, chainPreferences } from "./preferences";
import { ChainData, EMPTY_CHAIN, clearMonth, loadChain, saveChain, toggleDay } from "./store";
import { calendarIcon } from "./svg";
import { dayGlyph, renderWeekGlyphs } from "./text";

const WEEKDAY_FORMAT = new Intl.DateTimeFormat(undefined, { dateStyle: "full" });

/** ⌘ on macOS, Ctrl on Windows. */
function shortcut(key: Keyboard.KeyEquivalent, shift = false): Keyboard.Shortcut {
  return {
    macOS: { modifiers: shift ? ["cmd", "shift"] : ["cmd"], key },
    Windows: { modifiers: shift ? ["ctrl", "shift"] : ["ctrl"], key },
  };
}

export default function ChainMenuBar() {
  const id = environment.commandName;
  const index = chainIndex(id);
  const { weekStart, cellStyle, showDayLetters } = chainPreferences();

  const { data, isLoading, mutate } = useCachedPromise(loadChain, [id], {
    initialData: EMPTY_CHAIN,
    keepPreviousData: true,
  });

  const chain = data ?? EMPTY_CHAIN;
  const today = new Date();
  const thisMonth = monthKeyOf(today);
  // The view never advances by itself — a finished month stays on screen until
  // the user steps forward with ▶︎.
  const viewMonth = chain.viewMonth && chain.viewMonth < thisMonth ? chain.viewMonth : thisMonth;

  const weeks = buildWeeks(viewMonth, weekStart);
  const letters = dayLetters(weekStart);
  const marked = new Set(chain.marks[viewMonth] ?? []);
  const streak = currentStreak(chain.marks, today);

  const writes = useRef<Promise<unknown>>(Promise.resolve());

  async function update(apply: (current: ChainData) => ChainData) {
    // Queue so two menu actions cannot both snapshot the same render and save
    // over each other. Each save then applies against the latest persisted chain.
    const run = () =>
      mutate(saveChain(id, apply), {
        optimisticUpdate: (current) => apply(current ?? EMPTY_CHAIN),
        rollbackOnError: true,
        shouldRevalidateAfter: false,
      });

    const pending = writes.current.then(run, run);
    writes.current = pending.then(
      () => undefined,
      () => undefined,
    );
    await pending;
  }

  const goTo = (month: MonthKey) => update((current) => ({ ...current, viewMonth: month }));
  const toggle = (day: number) => update((current) => toggleDay({ ...current, viewMonth }, viewMonth, day));

  const { year, month } = parseMonthKey(viewMonth);
  const isCurrentMonth = viewMonth === thisMonth;

  const tooltip = [
    chainName(index),
    monthLabel(viewMonth),
    streak === 1 ? "1 day streak" : `${streak} day streak`,
  ].join(" · ");

  return (
    <MenuBarExtra
      isLoading={isLoading}
      tooltip={tooltip}
      icon={calendarIcon({ weeks, marked, style: cellStyle, letters: showDayLetters ? letters : undefined })}
    >
      <MenuBarExtra.Section title={showDayLetters ? letters.join("   ") : undefined}>
        {weeks.map((week, row) => (
          <MenuBarExtra.Submenu key={`week-${row}`} title={renderWeekGlyphs(week, marked, cellStyle)}>
            {week
              .filter((day): day is number => day !== null)
              .map((day) => (
                <MenuBarExtra.Item
                  key={day}
                  title={`${dayGlyph(marked.has(day), cellStyle)}   ${day}`}
                  tooltip={WEEKDAY_FORMAT.format(new Date(year, month, day))}
                  onAction={() => toggle(day)}
                />
              ))}
          </MenuBarExtra.Submenu>
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="◀︎"
          tooltip={monthLabel(addMonths(viewMonth, -1))}
          shortcut={shortcut("arrowLeft")}
          onAction={() => goTo(addMonths(viewMonth, -1))}
        />
        {!isCurrentMonth && (
          <MenuBarExtra.Item
            title="▶︎"
            tooltip={monthLabel(addMonths(viewMonth, 1))}
            shortcut={shortcut("arrowRight")}
            onAction={() => goTo(addMonths(viewMonth, 1))}
          />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        {isCurrentMonth ? (
          <MenuBarExtra.Item
            title="Cross Off Today"
            icon={marked.has(today.getDate()) ? Icon.CheckCircle : Icon.Circle}
            shortcut={shortcut("t")}
            onAction={() => toggle(today.getDate())}
          />
        ) : (
          <MenuBarExtra.Item
            title="Back to This Month"
            icon={Icon.Calendar}
            shortcut={shortcut("0")}
            onAction={() => goTo(thisMonth)}
          />
        )}
        <MenuBarExtra.Submenu title={`Clear ${monthLabel(viewMonth)}`} icon={Icon.Trash}>
          <MenuBarExtra.Item
            title="Yes, Clear Every Cross in This Month"
            icon={Icon.Trash}
            onAction={() => update((current) => clearMonth({ ...current, viewMonth }, viewMonth))}
          />
        </MenuBarExtra.Submenu>
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Export to Text File…"
          icon={Icon.Download}
          shortcut={shortcut("e", true)}
          onAction={() => launchCommand({ name: "export-calendar", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Settings…" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
