import {
  Color,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { loadSettings, Settings } from "./lib/settings";
import { addDays, getReferenceTimes, getTimeline, PrayerSlot, ReferenceTime, toDateKey } from "./lib/prayers";
import { activeSlot, AlertKind, menuBarState } from "./lib/state";
import { snooze } from "./lib/storage";
import { loadHistory, prayedSet, PrayerRecord, setPrayed, setStatus } from "./lib/tracker";
import { clockStatus, MARK_TITLES, markOptions, STATUS_LABELS } from "./lib/status";
import { statusIcon } from "./lib/status-icons";
import { formatTime, ltrName } from "./lib/format";
import { menuBarTitle, Period, periodBounds, periodSubtitle } from "./lib/menubar-title";
import { AlertWindows, MenuBarState } from "./lib/state";

/** The masjid on a disc colored by the prayer's period (lib/menubar-title.ts), like the app logo. */
const periodIcon = (period: Period) => ({
  source: { light: `masjid-bar-${period}.png`, dark: `masjid-bar-${period}-dark.png` },
});

/** One row of the dropdown: a prayer, or a reference time like sunrise. */
type Row = { type: "prayer"; slot: PrayerSlot; at: Date } | { type: "reference"; time: ReferenceTime; at: Date };

/**
 * Today's prayers and reference times in time order, plus the active prayer if it began yesterday
 * (late Isha) and tomorrow's Fajr once today's Isha has started.
 */
function dropdownRows(slots: PrayerSlot[], references: ReferenceTime[], active: PrayerSlot | undefined, now: Date) {
  const todayKey = toDateKey(now);
  const prayers = slots.filter((slot) => slot.date === todayKey);
  if (active && active.date !== todayKey) prayers.unshift(active);
  const isha = prayers.find((slot) => slot.date === todayKey && slot.key === "isha");
  const tomorrowFajr = slots.find((slot) => slot.date > todayKey && slot.key === "fajr");
  if (isha && isha.start <= now && tomorrowFajr) prayers.push(tomorrowFajr);
  const rows: Row[] = [
    ...prayers.map((slot) => ({ type: "prayer" as const, slot, at: slot.start })),
    ...references.map((time) => ({ type: "reference" as const, time, at: time.at })),
  ];
  return rows.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Color and status text for a prayer in the dropdown. */
function prayerStatus(slot: PrayerSlot, record: PrayerRecord | undefined, active: boolean, now: Date) {
  if (record?.completed && record.status) {
    return { icon: statusIcon(record.status), subtitle: STATUS_LABELS[record.status] };
  }
  if (slot.start > now) {
    const subtitle = slot.preferredEnd ? `Preferred until ${formatTime(slot.preferredEnd)}` : "";
    return { icon: { source: Icon.Clock, tintColor: Color.SecondaryText }, subtitle };
  }
  if (now >= slot.end || record?.status === "missed") {
    return { icon: statusIcon("missed"), subtitle: STATUS_LABELS.missed };
  }
  if (active && slot.preferredEnd && now >= slot.preferredEnd) {
    return {
      icon: { source: Icon.CircleProgress75, tintColor: Color.Orange },
      subtitle: `Preferred time over · ends ${formatTime(slot.end)}`,
    };
  }
  if (active) {
    const until = slot.preferredEnd ? `preferred until ${formatTime(slot.preferredEnd)}, ` : "";
    return {
      icon: { source: Icon.CircleProgress50, tintColor: Color.Blue },
      subtitle: `Now · ${until}ends ${formatTime(slot.end)}`,
    };
  }
  return { icon: { source: Icon.Circle, tintColor: Color.SecondaryText }, subtitle: "" };
}

/** Header for the current prayer's actions: its preferred end (the school's) and end. Ending soon is a setting, not a time. */
function sectionTitle(slot: PrayerSlot, windows: AlertWindows): string {
  const bounds = periodBounds(slot, windows);
  const preferred = bounds.hasPreferred ? `preferred until ${formatTime(bounds.preferred)}, ` : "";
  return `${ltrName(slot.name)} · ${preferred}ends ${formatTime(slot.end)}`;
}

/** The dropdown row of the menu bar's prayer: its period disc and the countdown in words. */
function periodStatus(state: MenuBarState, now: Date, windows: AlertWindows) {
  return {
    icon: periodIcon(menuBarTitle(state, now, windows).tone),
    subtitle: periodSubtitle(state, now, windows),
  };
}

export default function Command() {
  // Not cached: a cached copy can hold old preferences (e.g. "always show" off) and hide the item
  // before the fresh read lands. The read is a small LocalStorage lookup.
  const { data: settings, isLoading, error } = usePromise(loadSettings);
  if (!settings) {
    if (isLoading) return <MenuBarExtra isLoading icon={periodIcon("notStarted")} />;
    return (
      <MenuBarExtra icon={{ source: Icon.Warning, tintColor: Color.Orange }} tooltip={error?.message}>
        <MenuBarExtra.Item
          title="Set Prayer Location…"
          icon={Icon.Pin}
          onAction={() => launchCommand({ name: "set-location", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra>
    );
  }
  return <PrayerMenuBar settings={settings} />;
}

function PrayerMenuBar({ settings }: { settings: Settings }) {
  const now = new Date();
  const {
    data: history,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise((current: Settings) => loadHistory(current, addDays(new Date(), -1), new Date()), [settings], {
    keepPreviousData: true,
  });

  const slots = getTimeline(now, settings.schedule);
  const prayed = prayedSet(history ?? {});
  const state = menuBarState(slots, now, prayed, settings.windows, settings.menuBarAlways);

  if (!isLoading && !state && !error) return null;

  const current = activeSlot(slots, now);
  const formulaErrors = slots.filter(
    (slot) =>
      slot.date === toDateKey(now) &&
      slot.jamaatError &&
      !settings.warnings.some((warning) => warning.endsWith(slot.jamaatError!)),
  );
  const title = state ? menuBarTitle(state, now, settings.windows) : undefined;
  const rows = dropdownRows(slots, getReferenceTimes(now, settings.schedule), current, now);
  const shown = state && state.kind !== "upcoming" ? state.slot : undefined;
  const snoozeKind: AlertKind | undefined =
    state && (state.kind === "start" || state.kind === "jamaat" || state.kind === "ending") ? state.kind : undefined;

  const run = async (label: string, change: () => Promise<void>) => {
    try {
      await change();
      await showHUD(label);
    } catch (err) {
      await showHUD(err instanceof Error ? err.message : "Could not update");
    }
    revalidate();
  };

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={!title ? { source: Icon.Warning, tintColor: Color.Orange } : periodIcon(title.tone)}
      title={title?.text}
      tooltip={error ? `Reminders: ${error.message}` : "Prayer Times"}
    >
      {error && <MenuBarExtra.Item title="Can't read Reminders" subtitle={error.message} icon={Icon.Warning} />}
      {settings.warnings.map((warning) => (
        <MenuBarExtra.Item key={warning} title={warning} icon={Icon.Warning} onAction={openExtensionPreferences} />
      ))}
      {/* A formula that fails only on some days (e.g. no Dhuhr jamaat to follow) isn't in the settings warnings. */}
      {formulaErrors.map((slot) => (
        <MenuBarExtra.Item
          key={`${slot.id}:formula`}
          title={`${ltrName(slot.name)} Jamaat: ${slot.jamaatError}`}
          icon={Icon.Warning}
          onAction={() => launchCommand({ name: "jamaat-formulas", type: LaunchType.UserInitiated })}
        />
      ))}
      {shown && (
        <MenuBarExtra.Section title={sectionTitle(shown, settings.windows)}>
          <MenuBarExtra.Item
            title={`Mark ${ltrName(shown.name)} as Prayed`}
            icon={statusIcon(clockStatus(shown, now))}
            onAction={() => run(`${ltrName(shown.name)} marked prayed`, () => setPrayed(shown, settings, true))}
          />
          {markOptions(shown, undefined, now).map((status) => (
            <MenuBarExtra.Item
              key={status}
              title={`Mark ${ltrName(shown.name)} ${MARK_TITLES[status]}`}
              icon={statusIcon(status)}
              onAction={() =>
                run(`${ltrName(shown.name)} marked ${STATUS_LABELS[status].toLowerCase()}`, () =>
                  setStatus(shown, settings, status),
                )
              }
            />
          ))}
          {snoozeKind &&
            (settings.notify.banner || settings.notify.popup) &&
            [5, 10, 15].map((minutes) => (
              <MenuBarExtra.Item
                key={minutes}
                title={`Remind Me in ${minutes} Minutes`}
                icon={Icon.Clock}
                onAction={() => run(`Reminder in ${minutes} minutes`, () => snooze(shown.id, snoozeKind, minutes))}
              />
            ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section title="Today">
        {rows.map((row) => {
          if (row.type === "reference") {
            return (
              <MenuBarExtra.Item
                key={row.time.id}
                icon={{ source: row.time.name === "Sunrise" ? Icon.Sun : Icon.Moon, tintColor: Color.SecondaryText }}
                title={`${ltrName(row.time.name)}  ${formatTime(row.time.at)}`}
              />
            );
          }
          const { slot } = row;
          const record = history?.[slot.date]?.[slot.key];
          const done = Boolean(record?.completed);
          const status =
            state && slot.id === state.slot.id && !done
              ? periodStatus(state, now, settings.windows)
              : prayerStatus(slot, record, slot.id === current?.id, now);
          const jamaat = slot.jamaat ? ` · jamaat ${formatTime(slot.jamaat)}` : "";
          const started = slot.start <= now;
          // ⌥ marks on time: an unmarked prayer that is already late, or one recorded late.
          const onTimeAction = started && (done ? !record?.onTime : now >= slot.late);
          return (
            <MenuBarExtra.Item
              key={slot.id}
              icon={status.icon}
              title={`${ltrName(slot.name)}  ${formatTime(slot.start)}${jamaat}`}
              subtitle={status.subtitle}
              tooltip={
                started
                  ? `${done ? "Click to unmark" : "Click to mark prayed"}${onTimeAction ? " · ⌥ for on time" : ""}`
                  : undefined
              }
              onAction={
                started
                  ? () =>
                      done
                        ? run(`${ltrName(slot.name)} unmarked`, () => setPrayed(slot, settings, false))
                        : run(`${ltrName(slot.name)} marked prayed`, () => setPrayed(slot, settings, true))
                  : undefined
              }
              alternate={
                onTimeAction ? (
                  <MenuBarExtra.Item
                    icon={statusIcon("ontime")}
                    title={done ? `Change ${ltrName(slot.name)} to On Time` : `Mark ${ltrName(slot.name)} On Time`}
                    onAction={() =>
                      run(`${ltrName(slot.name)} marked on time`, () => setStatus(slot, settings, "ontime"))
                    }
                  />
                ) : undefined
              }
            />
          );
        })}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Today's Prayers"
          icon={Icon.List}
          onAction={() => launchCommand({ name: "today", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Open Reminders"
          icon={Icon.CheckList}
          onAction={() => open("/System/Applications/Reminders.app")}
        />
        <MenuBarExtra.Item
          title={`Location: ${settings.location.label}`}
          icon={settings.location.mode === "current" ? Icon.Geopin : Icon.Pin}
          onAction={() => launchCommand({ name: "set-location", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Preferences…" icon={Icon.Gear} onAction={openExtensionPreferences} />
        <MenuBarExtra.Item
          title="Turn Off Menu Bar…"
          icon={Icon.EyeDisabled}
          tooltip="Opens this command's settings in Raycast; switch it off there"
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
