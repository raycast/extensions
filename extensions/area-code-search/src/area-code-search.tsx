import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import areaCodes from "./area-codes-us.json";
// Coordinate-derived IANA zones, stored statically to avoid bundling geospatial boundary data.
import cityTimezones from "./city-timezones.json";

interface AreaCodeData {
  "area-code": number;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

type AreaCodeGroup = {
  code: string;
  entries: AreaCodeData[];
};

const TIMEZONE_SHORT_LABELS: Record<string, string> = {
  "America/New_York": "ET",
  "America/Detroit": "ET",
  "America/Indiana/Indianapolis": "ET",
  "America/Kentucky/Louisville": "ET",
  "America/Chicago": "CT",
  "America/Denver": "MT",
  "America/Boise": "MT",
  "America/Phoenix": "MST",
  "America/Los_Angeles": "PT",
  "America/Anchorage": "AKT",
  "America/Juneau": "AKT",
  "America/Sitka": "AKT",
  "Pacific/Honolulu": "HT",
};

function getTimezoneForEntry(entry: AreaCodeData): string {
  return (cityTimezones as Record<string, string>)[`${entry.city}|${entry.state}`] ?? "America/New_York";
}

function formatTimeForTimezone(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(new Date());
  } catch {
    return "";
  }
}

export default function AreaCodeSearch() {
  const [searchText, setSearchText] = useState("");
  const [, setClockTick] = useState(0);
  const normalizedQuery = searchText.trim().toLowerCase();
  const digitQuery = normalizedQuery.replace(/\D/g, "");

  useEffect(() => {
    const interval = setInterval(() => {
      setClockTick((value) => value + 1);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const filteredAreaCodes = useMemo(() => {
    if (!normalizedQuery) {
      return [] as AreaCodeData[];
    }

    return areaCodes.filter((entry: AreaCodeData) => {
      const areaCode = entry["area-code"].toString();
      const locationText = `${entry.city} ${entry.state}`.toLowerCase();
      const matchesAreaCode = digitQuery ? areaCode.startsWith(digitQuery) : false;
      const matchesLocation = locationText.includes(normalizedQuery);
      return matchesAreaCode || matchesLocation;
    });
  }, [digitQuery, normalizedQuery]);

  const groupedAreaCodes = useMemo(() => {
    const groups = new Map<string, AreaCodeData[]>();

    for (const entry of filteredAreaCodes) {
      const code = entry["area-code"].toString();
      const bucket = groups.get(code);
      if (bucket) {
        bucket.push(entry);
      } else {
        groups.set(code, [entry]);
      }
    }

    const grouped: AreaCodeGroup[] = Array.from(groups.entries()).map(([code, entries]) => ({
      code,
      entries: entries.sort((a, b) => a.city.localeCompare(b.city)),
    }));

    return grouped.sort((a, b) => Number(a.code) - Number(b.code));
  }, [filteredAreaCodes]);

  return (
    <List onSearchTextChange={setSearchText} searchBarPlaceholder="Search by area code, city, or state..." throttle>
      {normalizedQuery.length === 0 ? (
        <List.EmptyView
          description="Search using area code digits or city/state text"
          icon={Icon.MagnifyingGlass}
          title="Search Area Codes"
        />
      ) : groupedAreaCodes.length === 0 ? (
        <List.EmptyView description={`No matches for "${searchText}"`} icon={Icon.XMarkCircle} title="No Results" />
      ) : (
        groupedAreaCodes.map((group) => (
          <List.Section key={group.code} title={`Area Code ${group.code} (${group.entries.length} cities)`}>
            {group.entries.map((entry, index) => {
              const location = `${entry.city}, ${entry.state}`;
              const timezone = getTimezoneForEntry(entry);
              const timezoneLabel = TIMEZONE_SHORT_LABELS[timezone] || timezone;
              const localTime = formatTimeForTimezone(timezone);
              return (
                <List.Item
                  accessories={[
                    { text: group.code },
                    { text: timezoneLabel },
                    ...(localTime ? [{ text: localTime }] : []),
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard content={group.code} title="Copy Area Code" />
                      <Action.CopyToClipboard content={location} title="Copy Location" />
                      <Action.CopyToClipboard
                        content={`${group.code} — ${location}`}
                        title="Copy Area Code + Location"
                      />
                    </ActionPanel>
                  }
                  key={`${group.code}-${entry.city}-${entry.state}-${entry.latitude}-${entry.longitude}-${index}`}
                  subtitle={`${entry.state} · ${timezoneLabel}`}
                  title={entry.city}
                />
              );
            })}
          </List.Section>
        ))
      )}
    </List>
  );
}
