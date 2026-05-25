import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Form,
  Grid,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  getPreferenceValues,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

type Clock = {
  id: string;
  label: string;
  timeZone: string;
};

type ClockDisplay = ReturnType<typeof getClockDisplay>;
type Settings = {
  timeZones: string;
  viewMode: Preferences["viewMode"];
  clockStyle: Preferences["clockStyle"];
  use24HourTime: boolean;
  showSeconds: boolean;
};

type AddTimeZoneValues = {
  timeZone: string;
};

const SETTINGS_KEY = "settings";

const DEFAULT_TIME_ZONES = [
  "San Francisco",
  "New York",
  "London",
  "Tokyo",
].join(", ");

const CITY_TIME_ZONES: Record<string, { label: string; timeZone: string }> = {
  amsterdam: { label: "Amsterdam", timeZone: "Europe/Amsterdam" },
  bangkok: { label: "Bangkok", timeZone: "Asia/Bangkok" },
  beijing: { label: "Beijing", timeZone: "Asia/Shanghai" },
  berlin: { label: "Berlin", timeZone: "Europe/Berlin" },
  boston: { label: "Boston", timeZone: "America/New_York" },
  chicago: { label: "Chicago", timeZone: "America/Chicago" },
  dubai: { label: "Dubai", timeZone: "Asia/Dubai" },
  hongkong: { label: "Hong Kong", timeZone: "Asia/Hong_Kong" },
  "hong kong": { label: "Hong Kong", timeZone: "Asia/Hong_Kong" },
  istanbul: { label: "Istanbul", timeZone: "Europe/Istanbul" },
  jakarta: { label: "Jakarta", timeZone: "Asia/Jakarta" },
  london: { label: "London", timeZone: "Europe/London" },
  losangeles: { label: "Los Angeles", timeZone: "America/Los_Angeles" },
  "los angeles": { label: "Los Angeles", timeZone: "America/Los_Angeles" },
  madrid: { label: "Madrid", timeZone: "Europe/Madrid" },
  melbourne: { label: "Melbourne", timeZone: "Australia/Melbourne" },
  mumbai: { label: "Mumbai", timeZone: "Asia/Kolkata" },
  newyork: { label: "New York", timeZone: "America/New_York" },
  "new york": { label: "New York", timeZone: "America/New_York" },
  nyc: { label: "New York", timeZone: "America/New_York" },
  paris: { label: "Paris", timeZone: "Europe/Paris" },
  sanfrancisco: { label: "San Francisco", timeZone: "America/Los_Angeles" },
  "san francisco": { label: "San Francisco", timeZone: "America/Los_Angeles" },
  seattle: { label: "Seattle", timeZone: "America/Los_Angeles" },
  seoul: { label: "Seoul", timeZone: "Asia/Seoul" },
  shanghai: { label: "Shanghai", timeZone: "Asia/Shanghai" },
  singapore: { label: "Singapore", timeZone: "Asia/Singapore" },
  sydney: { label: "Sydney", timeZone: "Australia/Sydney" },
  taipei: { label: "Taipei", timeZone: "Asia/Taipei" },
  tokyo: { label: "Tokyo", timeZone: "Asia/Tokyo" },
  toronto: { label: "Toronto", timeZone: "America/Toronto" },
  vancouver: { label: "Vancouver", timeZone: "America/Vancouver" },
};

function getInitialSettings(preferences: Preferences): Settings {
  return {
    timeZones: preferences.timeZones || DEFAULT_TIME_ZONES,
    viewMode: preferences.viewMode || "grid",
    clockStyle: preferences.clockStyle || "digital",
    use24HourTime: preferences.use24HourTime,
    showSeconds: preferences.showSeconds,
  };
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [settings, setSettings] = useState<Settings>(() =>
    getInitialSettings(preferences),
  );
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    LocalStorage.getItem<string>(SETTINGS_KEY).then((storedSettings) => {
      if (!storedSettings) return;

      try {
        setSettings({
          ...getInitialSettings(preferences),
          ...JSON.parse(storedSettings),
        });
      } catch {
        setSettings(getInitialSettings(preferences));
      }
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(
      () => setNow(new Date()),
      settings.showSeconds ? 1000 : 15_000,
    );
    return () => clearInterval(interval);
  }, [settings.showSeconds]);

  const clocks = useMemo(
    () => parseClocks(settings.timeZones || DEFAULT_TIME_ZONES),
    [settings.timeZones],
  );

  async function updateSettings(nextSettings: Settings, toastTitle?: string) {
    setSettings(nextSettings);
    await LocalStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
    if (toastTitle) {
      await showToast({ style: Toast.Style.Success, title: toastTitle });
    }
  }

  const actions = {
    toggleViewMode: () =>
      updateSettings(
        {
          ...settings,
          viewMode: settings.viewMode === "grid" ? "list" : "grid",
        },
        settings.viewMode === "grid" ? "Switched to List" : "Switched to Grid",
      ),
    toggleClockStyle: () =>
      updateSettings(
        {
          ...settings,
          clockStyle: settings.clockStyle === "digital" ? "analog" : "digital",
        },
        settings.clockStyle === "digital"
          ? "Switched to Analog"
          : "Switched to Digital",
      ),
    toggleHourFormat: () =>
      updateSettings(
        { ...settings, use24HourTime: !settings.use24HourTime },
        settings.use24HourTime
          ? "Switched to 12-Hour Time"
          : "Switched to 24-Hour Time",
      ),
    addTimeZone: async (entry: string) => {
      const clock = parseClocks(entry)[0];
      if (!clock) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Unknown Time Zone",
          message: entry,
        });
        return;
      }

      const nextClocks = [
        ...clocks.filter(
          (existingClock) => existingClock.timeZone !== clock.timeZone,
        ),
        clock,
      ];
      await updateSettings(
        { ...settings, timeZones: nextClocks.map(serializeClock).join(", ") },
        `Added ${clock.label}`,
      );
      await popToRoot({ clearSearchBar: false });
    },
    deleteTimeZone: (clock: Clock) =>
      updateSettings(
        {
          ...settings,
          timeZones: clocks
            .filter(
              (existingClock) => existingClock.timeZone !== clock.timeZone,
            )
            .map(serializeClock)
            .join(", "),
        },
        `Removed ${clock.label}`,
      ),
  };

  if (settings.viewMode === "list") {
    return (
      <ClockList
        clocks={clocks}
        now={now}
        settings={settings}
        actions={actions}
      />
    );
  }

  return (
    <ClockGrid
      clocks={clocks}
      now={now}
      settings={settings}
      actions={actions}
    />
  );
}

function ClockGrid({
  clocks,
  now,
  settings,
  actions,
}: {
  clocks: Clock[];
  now: Date;
  settings: Settings;
  actions: CommandActions;
}) {
  return (
    <Grid
      columns={4}
      aspectRatio="4/3"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Zero}
      navigationTitle="World Clock"
      searchBarPlaceholder="Search time zones"
      filtering={{ keepSectionOrder: true }}
    >
      {clocks.length === 0 ? (
        <Grid.EmptyView
          icon={Icon.Clock}
          title="No Time Zones Configured"
          description="Add city names in preferences, for example: San Francisco, New York, London, Tokyo"
          actions={<EmptyActionPanel actions={actions} />}
        />
      ) : (
        clocks.map((clock) => {
          const display = getClockDisplay(clock, now, settings);

          return (
            <Grid.Item
              key={clock.id}
              id={clock.id}
              content={makeClockCard(clock, display, settings.clockStyle)}
              title={clock.label}
              keywords={[
                clock.timeZone,
                display.city,
                display.abbreviation,
                display.period,
              ]}
              accessory={{ icon: display.periodIcon, tooltip: display.period }}
              actions={
                <ClockActionPanel
                  clock={clock}
                  display={display}
                  actions={actions}
                  settings={settings}
                />
              }
            />
          );
        })
      )}
    </Grid>
  );
}

function ClockList({
  clocks,
  now,
  settings,
  actions,
}: {
  clocks: Clock[];
  now: Date;
  settings: Settings;
  actions: CommandActions;
}) {
  return (
    <List
      navigationTitle="World Clock"
      searchBarPlaceholder="Search time zones"
      filtering={{ keepSectionOrder: true }}
    >
      {clocks.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Time Zones Configured"
          description="Add city names in preferences, for example: San Francisco, New York, London, Tokyo"
          actions={<EmptyActionPanel actions={actions} />}
        />
      ) : (
        clocks.map((clock) => {
          const display = getClockDisplay(clock, now, settings);

          return (
            <List.Item
              key={clock.id}
              id={clock.id}
              icon={{
                source: display.periodIcon,
                tintColor: display.periodColor,
              }}
              title={display.time}
              subtitle={clock.label}
              keywords={[
                clock.timeZone,
                display.city,
                display.abbreviation,
                display.period,
              ]}
              accessories={[
                { text: display.date },
                { text: display.timeZoneName },
              ]}
              actions={
                <ClockActionPanel
                  clock={clock}
                  display={display}
                  actions={actions}
                  settings={settings}
                />
              }
            />
          );
        })
      )}
    </List>
  );
}

function ClockActionPanel({
  clock,
  display,
  settings,
  actions,
}: {
  clock: Clock;
  display: ClockDisplay;
  settings: Settings;
  actions: CommandActions;
}) {
  return (
    <ActionPanel>
      <ActionPanel.Section title={clock.label}>
        <Action.CopyToClipboard
          title="Copy Time"
          content={`${clock.label}: ${display.time} (${clock.timeZone})`}
        />
        <Action
          title={`Switch to ${settings.viewMode === "grid" ? "List" : "Grid"}`}
          icon={Icon.Window}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
          onAction={actions.toggleViewMode}
        />
        <Action
          title="Paste Time"
          icon={Icon.TextCursor}
          onAction={() => pasteTime(clock, display.time)}
        />
        <Action.CopyToClipboard
          title="Copy Time Zone"
          content={clock.timeZone}
        />
        <Action
          title="Open Raycast Extension Preferences"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="World Clock Settings">
        <Action.Push
          title="Add Time Zone"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          target={<AddTimeZoneForm onAdd={actions.addTimeZone} />}
        />
        <Action
          title={`Use ${settings.use24HourTime ? "12-Hour" : "24-Hour"} Time`}
          icon={Icon.Clock}
          onAction={actions.toggleHourFormat}
        />
        <Action
          title={`Use ${settings.clockStyle === "digital" ? "Analog" : "Digital"} Cards`}
          icon={Icon.Circle}
          onAction={actions.toggleClockStyle}
        />
        <Action
          title={`Remove ${clock.label}`}
          icon={Icon.Trash}
          shortcut={Keyboard.Shortcut.Common.Remove}
          style={Action.Style.Destructive}
          onAction={() => actions.deleteTimeZone(clock)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

type CommandActions = {
  toggleViewMode: () => Promise<void>;
  toggleClockStyle: () => Promise<void>;
  toggleHourFormat: () => Promise<void>;
  addTimeZone: (entry: string) => Promise<void>;
  deleteTimeZone: (clock: Clock) => Promise<void>;
};

function EmptyActionPanel({ actions }: { actions: CommandActions }) {
  return (
    <ActionPanel>
      <Action.Push
        title="Add Time Zone"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<AddTimeZoneForm onAdd={actions.addTimeZone} />}
      />
      <Action
        title="Open Raycast Extension Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );
}

function AddTimeZoneForm({
  onAdd,
}: {
  onAdd: (entry: string) => Promise<void>;
}) {
  return (
    <Form
      navigationTitle="Add Time Zone"
      actions={
        <ActionPanel>
          <Action.SubmitForm<AddTimeZoneValues>
            title="Add Time Zone"
            icon={Icon.Plus}
            onSubmit={(values) => onAdd(values.timeZone)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="timeZone"
        title="City"
        placeholder="Paris, Singapore, Tokyo, or Europe/London"
      />
      <Form.Description text="Use a city name for common places. Advanced IANA time zones like Europe/London also work." />
    </Form>
  );
}

function parseClocks(rawTimeZones: string): Clock[] {
  return splitClockEntries(rawTimeZones)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((entry) => {
      const { label: rawLabel, timeZone: rawTimeZone } = parseClockEntry(entry);
      const timeZone = rawTimeZone.trim();
      const label = (rawLabel?.trim() || formatTimeZoneLabel(timeZone)).trim();

      return { id: timeZone, label, timeZone };
    })
    .filter((clock) => isValidTimeZone(clock.timeZone));
}

function splitClockEntries(rawTimeZones: string): string[] {
  return rawTimeZones.split(/[\n;]+/).flatMap((entry) => {
    if (containsIanaTimeZone(entry)) return entry;
    return entry.split(",");
  });
}

function serializeClock(clock: Clock): string {
  const friendlyClock = CITY_TIME_ZONES[normalizeCityName(clock.label)];
  if (friendlyClock?.timeZone === clock.timeZone) {
    return clock.label;
  }

  return `${clock.label} (${clock.timeZone})`;
}

function getClockDisplay(clock: Clock, now: Date, preferences: Preferences) {
  const time = new Intl.DateTimeFormat(undefined, {
    timeZone: clock.timeZone,
    hour: "numeric",
    minute: "2-digit",
    second: preferences.showSeconds ? "2-digit" : undefined,
    hour12: !preferences.use24HourTime,
  }).format(now);

  const date = new Intl.DateTimeFormat(undefined, {
    timeZone: clock.timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(now);

  const offset = formatOffset(clock.timeZone, now);
  const abbreviation = formatTimeZoneName(clock.timeZone, now);
  const relativeDay = getRelativeDay(clock.timeZone, now);
  const timeZoneName = `${abbreviation} · ${offset}`;
  const parts = getTimeParts(clock.timeZone, now);
  const isDay = parts.hour >= 6 && parts.hour < 18;

  return {
    ...parts,
    time,
    date,
    offset,
    abbreviation,
    relativeDay,
    timeZoneName,
    city: formatTimeZoneLabel(clock.timeZone),
    period: isDay ? "Day" : "Night",
    periodIcon: isDay ? Icon.Sun : Icon.Moon,
    periodColor: isDay ? Color.Yellow : Color.Blue,
  };
}

function parseClockEntry(entry: string): { label?: string; timeZone: string } {
  const cityTimeZone = CITY_TIME_ZONES[normalizeCityName(entry)];
  if (cityTimeZone) {
    return cityTimeZone;
  }

  const parenthesizedTimeZone = entry.match(
    /^(?<label>.+?)\s*\((?<timeZone>[A-Za-z_]+\/[A-Za-z_/-]+)\)$/,
  );
  if (parenthesizedTimeZone?.groups) {
    return {
      label: parenthesizedTimeZone.groups.label,
      timeZone: parenthesizedTimeZone.groups.timeZone,
    };
  }

  const ianaTimeZone = entry.match(/(?<timeZone>[A-Za-z_]+\/[A-Za-z_/-]+)$/)
    ?.groups?.timeZone;
  if (!ianaTimeZone) {
    return { timeZone: entry };
  }

  const label = entry
    .slice(0, entry.length - ianaTimeZone.length)
    .replace(/[|,–—-]+\s*$/, "")
    .trim();

  return { label: label || undefined, timeZone: ianaTimeZone };
}

function containsIanaTimeZone(entry: string): boolean {
  return /[A-Za-z_]+\/[A-Za-z_/-]+/.test(entry);
}

function normalizeCityName(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function getTimeParts(timeZone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return {
    hour: Number(parts.find((part) => part.type === "hour")?.value) % 24,
    minute: Number(parts.find((part) => part.type === "minute")?.value),
    second: Number(parts.find((part) => part.type === "second")?.value),
  };
}

function formatTimeZoneLabel(timeZone: string): string {
  const city = timeZone.split("/").at(-1) || timeZone;
  return city.replace(/_/g, " ");
}

function formatTimeZoneName(timeZone: string, date: Date): string {
  const timeZoneName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  return timeZoneName || timeZone;
}

function formatOffset(timeZone: string, date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const offset = parts.find((part) => part.type === "timeZoneName")?.value;

  return offset?.replace("GMT", "UTC") || formatTimeZoneName(timeZone, date);
}

function getRelativeDay(timeZone: string, date: Date): string {
  const localDay = getDayKey(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    date,
  );
  const clockDay = getDayKey(timeZone, date);
  const delta = Math.round((clockDay - localDay) / 86_400_000);

  if (delta === -1) return "Yesterday";
  if (delta === 1) return "Tomorrow";
  if (delta < -1) return `${Math.abs(delta)} days ago`;
  if (delta > 1) return `In ${delta} days`;
  return "Today";
}

function getDayKey(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return Date.UTC(year, month - 1, day);
}

function makeClockCard(
  clock: Clock,
  display: ClockDisplay,
  clockStyle: Preferences["clockStyle"],
): string {
  const isDay = display.period === "Day";
  const background = isDay ? "#fbfbfd" : "#1c1c1e";
  const primary = isDay ? "#1d1d1f" : "#f5f5f7";
  const secondary = isDay ? "#86868b" : "#8e8e93";
  const accent = isDay ? "#f5a623" : "#6e9bff";
  const clockContent =
    clockStyle === "analog"
      ? makeAnalogClock(display, primary, secondary, accent)
      : makeDigitalClock(display, primary);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <rect width="800" height="600" rx="48" fill="${background}" />
      ${clockContent}
      <text x="400" y="512" text-anchor="middle" fill="${secondary}" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="32" font-weight="500">${escapeXml(display.relativeDay)} · ${escapeXml(display.date)}</text>
    </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function makeDigitalClock(display: ClockDisplay, color: string): string {
  return `<text x="400" y="328" text-anchor="middle" fill="${color}" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="128" font-weight="680" letter-spacing="-6">${escapeXml(display.time)}</text>`;
}

function makeAnalogClock(
  display: ClockDisplay,
  primary: string,
  secondary: string,
  accent: string,
): string {
  const hourAngle = ((display.hour % 12) + display.minute / 60) * 30;
  const minuteAngle = display.minute * 6;
  const secondAngle = display.second * 6;

  return `
    <g transform="translate(400 286)">
      <circle r="150" fill="none" stroke="${secondary}" stroke-width="6" opacity="0.25" />
      ${Array.from({ length: 12 }, (_, index) => {
        const angle = index * 30;
        return `<line x1="0" y1="-130" x2="0" y2="-144" stroke="${secondary}" stroke-width="5" stroke-linecap="round" transform="rotate(${angle})" opacity="0.5" />`;
      }).join("")}
      <line x1="0" y1="10" x2="0" y2="-84" stroke="${primary}" stroke-width="12" stroke-linecap="round" transform="rotate(${hourAngle})" />
      <line x1="0" y1="16" x2="0" y2="-120" stroke="${primary}" stroke-width="8" stroke-linecap="round" transform="rotate(${minuteAngle})" />
      <line x1="0" y1="20" x2="0" y2="-134" stroke="${accent}" stroke-width="3" stroke-linecap="round" transform="rotate(${secondAngle})" />
      <circle r="9" fill="${accent}" />
    </g>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function pasteTime(clock: Clock, time: string) {
  const content = `${clock.label}: ${time}`;
  await Clipboard.paste(content);
  await showToast({
    style: Toast.Style.Success,
    title: "Pasted Time",
    message: content,
  });
}
