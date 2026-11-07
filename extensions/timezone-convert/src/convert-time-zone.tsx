import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { Conversion, parseQuery } from "./lib/parse";
import { TimeZone, localTimeZone, resolveZone } from "./lib/zones";
import {
  abbreviation,
  dayDifference,
  describeRelative,
  formatClock,
  formatDateLong,
  formatDateShort,
  formatOffset,
  formatOffsetDifference,
  formatQueryDateTime,
  offsetMinutes,
} from "./lib/time";

const LOCAL = localTimeZone();
const DEFAULT_PINNED = ["Europe/Rome", "America/New_York", "Asia/Tokyo"];

const EXAMPLES = ["9am PST to CET", "now in Tokyo", "tomorrow 14:30 Europe/Rome to SF", "in 2 hours to NYC"];

/** A handful of well-known zones for the "all zones" table. */
const MAJOR_ZONES = [
  "UTC",
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Phoenix",
  "America/Chicago",
  "America/Mexico_City",
  "America/New_York",
  "America/Toronto",
  "America/Bogota",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "Atlantic/Reykjavik",
  "Europe/London",
  "Europe/Lisbon",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Amsterdam",
  "Europe/Zurich",
  "Europe/Stockholm",
  "Europe/Warsaw",
  "Europe/Athens",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Africa/Casablanca",
  "Africa/Lagos",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Nairobi",
  "Asia/Jerusalem",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Kathmandu",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Manila",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Perth",
  "Australia/Adelaide",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function pinnedZones(raw: string | undefined): TimeZone[] {
  const source = raw?.trim() ? raw.split(",") : DEFAULT_PINNED;
  const seen = new Set<string>();
  const zones: TimeZone[] = [];
  for (const entry of source) {
    const zone = resolveZone(entry, LOCAL);
    if (zone && !seen.has(zone.id)) {
      seen.add(zone.id);
      zones.push(zone);
    }
  }
  if (zones.length > 0) return zones;
  return DEFAULT_PINNED.map((id) => resolveZone(id, LOCAL)).filter((zone): zone is TimeZone => zone !== null);
}

function useNow(intervalMs = 20_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function dayTag(days: number): List.Item.Accessory | null {
  if (days === 0) return null;
  return { tag: { value: days > 0 ? `+${days}d` : `${days}d`, color: Color.Orange } };
}

function compactAccessories(accessories: (List.Item.Accessory | null)[]): List.Item.Accessory[] {
  return accessories.filter((accessory): accessory is List.Item.Accessory => accessory !== null);
}

type ZoneRowProps = {
  zone: TimeZone;
  instant: number;
  reference: TimeZone;
  hour12: boolean;
  onQuery: (query: string) => void;
  icon?: Icon;
};

function ZoneRow({ zone, instant, reference, hour12, onQuery, icon = Icon.Globe }: ZoneRowProps) {
  const clock = formatClock(zone, instant, hour12);
  const abbr = abbreviation(zone, instant);
  const offset = formatOffset(offsetMinutes(zone, instant));
  const accessories = compactAccessories([
    dayTag(dayDifference(reference, zone, instant)),
    { text: formatDateShort(zone, instant) },
    { text: abbr, tooltip: `${zone.id} · ${offset}` },
  ]);

  return (
    <List.Item
      icon={icon}
      title={clock}
      subtitle={zone.label}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Time" content={clock} />
          <Action.CopyToClipboard title="Copy Time with Zone" content={`${clock} ${abbr}`} />
          <Action
            title={`Show ${zone.label} Time`}
            icon={Icon.ArrowRight}
            onAction={() => onQuery(`now to ${zone.id}`)}
          />
          <Action
            title={`Convert from ${zone.label}`}
            icon={Icon.ArrowLeft}
            onAction={() => onQuery(`${formatQueryDateTime(zone, instant)} ${zone.id} to ${LOCAL.id}`)}
          />
        </ActionPanel>
      }
    />
  );
}

type ResultRowProps = {
  conversion: Conversion;
  now: number;
  hour12: boolean;
  onQuery: (query: string) => void;
};

function ResultRow({ conversion, now, hour12, onQuery }: ResultRowProps) {
  const { from, to, instant } = conversion;
  const clock = formatClock(to, instant, hour12);
  const sourceClock = formatClock(from, instant, hour12);
  const targetAbbr = abbreviation(to, instant);
  const sourceAbbr = abbreviation(from, instant);
  const offset = formatOffset(offsetMinutes(to, instant));
  const conversionText = `${sourceClock} ${sourceAbbr} → ${clock} ${targetAbbr}`;
  const accessories = compactAccessories([
    dayTag(dayDifference(from, to, instant)),
    conversion.explicit ? { text: describeRelative(instant, now) } : null,
    { text: targetAbbr, tooltip: `${to.id} · ${offset}` },
  ]);

  return (
    <List.Item
      icon={Icon.Clock}
      title={clock}
      subtitle={`${to.label} · ${offset}`}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Time" content={clock} />
          <Action.Paste title="Paste Time" content={clock} />
          <Action.CopyToClipboard
            title="Copy Conversion"
            content={conversionText}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy ISO 8601"
            content={new Date(instant).toISOString()}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
          <Action.CopyToClipboard
            title="Copy Unix Timestamp"
            content={String(Math.floor(instant / 1000))}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
          />
          <Action.Push
            title="Show All Zones"
            icon={Icon.Globe}
            target={<AllZones conversion={conversion} hour12={hour12} />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          />
          <Action
            title="Swap Zones"
            icon={Icon.Switch}
            shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
            onAction={() => onQuery(`${formatQueryDateTime(to, instant)} ${to.id} to ${from.id}`)}
          />
          <ActionPanel.Section>
            <Action
              title={`Show ${to.label} Time`}
              icon={Icon.ArrowRight}
              onAction={() => onQuery(`now to ${to.id}`)}
            />
            <Action title="Clear Query" icon={Icon.XMarkCircle} onAction={() => onQuery("")} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function AllZones({ conversion, hour12 }: { conversion: Conversion; hour12: boolean }) {
  const { from, to, instant } = conversion;

  const markdown = useMemo(() => {
    const ids = new Set<string>([from.id, to.id, ...MAJOR_ZONES]);
    const zones = [...ids]
      .map((id) => resolveZone(id, LOCAL))
      .filter((zone): zone is TimeZone => zone !== null)
      .sort((a, b) => offsetMinutes(a, instant) - offsetMinutes(b, instant) || a.label.localeCompare(b.label));

    const targetOffset = offsetMinutes(to, instant);
    const rows = zones.map((zone) => {
      const days = dayDifference(to, zone, instant);
      const day = days === 0 ? "" : days > 0 ? ` (+${days}d)` : ` (${days}d)`;
      return `| ${zone.label} | ${formatClock(zone, instant, hour12)}${day} | ${abbreviation(zone, instant)} | ${formatOffset(
        offsetMinutes(zone, instant),
      )} | ${formatOffsetDifference(offsetMinutes(zone, instant) - targetOffset)} |`;
    });

    return [
      `# ${formatClock(to, instant, hour12)} — ${to.label}`,
      "",
      `**${formatClock(from, instant, hour12)} ${abbreviation(from, instant)}** in ${from.label} is **${formatClock(
        to,
        instant,
        hour12,
      )} ${abbreviation(to, instant)}** in ${to.label}.`,
      "",
      formatDateLong(to, instant),
      "",
      "| Zone | Time | Abbrev. | Offset | vs. target |",
      "| --- | --- | --- | --- | --- |",
      ...rows,
    ].join("\n");
  }, [from, to, instant, hour12]);

  return (
    <Detail
      navigationTitle="All Zones"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Table" content={markdown} />
        </ActionPanel>
      }
    />
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments.ConvertTimeZone }>) {
  const preferences = getPreferenceValues<Preferences>();
  const pinned = useMemo(() => pinnedZones(preferences.pinnedZones), [preferences.pinnedZones]);
  const [hour12, setHour12] = useState(preferences.timeFormat === "12-hour");
  const [searchText, setSearchText] = useState(props.arguments?.query?.trim() ?? "");
  const now = useNow();
  const outcome = useMemo(() => parseQuery(searchText, LOCAL, now), [searchText, now]);

  const otherPinned =
    outcome.kind === "conversion"
      ? pinned.filter((zone) => zone.id !== outcome.conversion.from.id && zone.id !== outcome.conversion.to.id)
      : [];

  const exampleActions = (
    <ActionPanel>
      {EXAMPLES.map((example) => (
        <Action
          key={example}
          title={`Try "${example}"`}
          icon={Icon.TextCursor}
          onAction={() => setSearchText(example)}
        />
      ))}
    </ActionPanel>
  );

  return (
    <List
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder='Try "9am PST to CET" or "now in Tokyo"'
      searchBarAccessory={
        <List.Dropdown
          tooltip="Time Format"
          value={hour12 ? "12" : "24"}
          onChange={(value) => setHour12(value === "12")}
        >
          <List.Dropdown.Item title="24-hour" value="24" />
          <List.Dropdown.Item title="12-hour" value="12" />
        </List.Dropdown>
      }
    >
      {outcome.kind === "empty" && (
        <>
          <List.Section title="Right Now" subtitle={formatDateShort(LOCAL, now)}>
            <ZoneRow
              zone={LOCAL}
              instant={now}
              reference={LOCAL}
              hour12={hour12}
              onQuery={setSearchText}
              icon={Icon.House}
            />
          </List.Section>
          <List.Section title="Pinned Zones">
            {pinned.map((zone) => (
              <ZoneRow
                key={zone.id}
                zone={zone}
                instant={now}
                reference={LOCAL}
                hour12={hour12}
                onQuery={setSearchText}
                icon={Icon.Pin}
              />
            ))}
          </List.Section>
          <List.Section title="Examples">
            {EXAMPLES.map((example) => (
              <List.Item
                key={example}
                icon={Icon.TextCursor}
                title={example}
                actions={
                  <ActionPanel>
                    <Action title="Use This Example" onAction={() => setSearchText(example)} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}

      {outcome.kind === "error" && (
        <List.EmptyView
          icon={Icon.QuestionMark}
          title={outcome.message}
          description={outcome.hint}
          actions={exampleActions}
        />
      )}

      {outcome.kind === "conversion" && (
        <>
          <List.Section title="Converted">
            <ResultRow conversion={outcome.conversion} now={now} hour12={hour12} onQuery={setSearchText} />
          </List.Section>

          {outcome.conversion.explicit && (
            <List.Section title="Source">
              <ZoneRow
                zone={outcome.conversion.from}
                instant={outcome.conversion.instant}
                reference={outcome.conversion.from}
                hour12={hour12}
                onQuery={setSearchText}
                icon={Icon.Clock}
              />
            </List.Section>
          )}

          {otherPinned.length > 0 && (
            <List.Section title="Also At That Moment">
              {otherPinned.map((zone) => (
                <ZoneRow
                  key={zone.id}
                  zone={zone}
                  instant={outcome.conversion.instant}
                  reference={outcome.conversion.to}
                  hour12={hour12}
                  onQuery={setSearchText}
                  icon={Icon.Pin}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
