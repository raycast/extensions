import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import areaCodes from "./area-codes-us.json";

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
  "America/Chicago": "CT",
  "America/Denver": "MT",
  "America/Phoenix": "MST",
  "America/Los_Angeles": "PT",
  "America/Anchorage": "AKT",
  "Pacific/Honolulu": "HT",
};

const SINGLE_ZONE_STATES: Record<string, string> = {
  Alabama: "America/Chicago",
  Alaska: "America/Anchorage",
  Arizona: "America/Phoenix",
  Arkansas: "America/Chicago",
  California: "America/Los_Angeles",
  Colorado: "America/Denver",
  Connecticut: "America/New_York",
  Delaware: "America/New_York",
  Georgia: "America/New_York",
  Hawaii: "Pacific/Honolulu",
  Iowa: "America/Chicago",
  Louisiana: "America/Chicago",
  Maine: "America/New_York",
  Maryland: "America/New_York",
  Massachusetts: "America/New_York",
  Minnesota: "America/Chicago",
  Mississippi: "America/Chicago",
  Missouri: "America/Chicago",
  Montana: "America/Denver",
  Nevada: "America/Los_Angeles",
  New_Hampshire: "America/New_York",
  New_Jersey: "America/New_York",
  New_Mexico: "America/Denver",
  New_York: "America/New_York",
  North_Carolina: "America/New_York",
  Ohio: "America/New_York",
  Oklahoma: "America/Chicago",
  Pennsylvania: "America/New_York",
  Rhode_Island: "America/New_York",
  South_Carolina: "America/New_York",
  Utah: "America/Denver",
  Vermont: "America/New_York",
  Virginia: "America/New_York",
  Washington: "America/Los_Angeles",
  West_Virginia: "America/New_York",
  Wisconsin: "America/Chicago",
  Wyoming: "America/Denver",
  District_of_Columbia: "America/New_York",
};

function normalizeStateKey(state: string): string {
  return state.replaceAll(" ", "_");
}

function getFallbackTimezoneByLongitude(longitude: number): string {
  if (longitude >= -82.5) {
    return "America/New_York";
  }
  if (longitude >= -97.5) {
    return "America/Chicago";
  }
  if (longitude >= -112.5) {
    return "America/Denver";
  }
  return "America/Los_Angeles";
}

function getTimezoneForEntry(entry: AreaCodeData): string {
  const normalizedState = normalizeStateKey(entry.state);
  const singleZone = SINGLE_ZONE_STATES[normalizedState];
  if (singleZone) {
    return singleZone;
  }

  // Multi-timezone state heuristics.
  if (entry.state === "Florida") {
    return entry.longitude <= -85 ? "America/Chicago" : "America/New_York";
  }
  if (entry.state === "Texas") {
    return entry.longitude <= -103 ? "America/Denver" : "America/Chicago";
  }
  if (entry.state === "Kansas") {
    return entry.longitude <= -100 ? "America/Denver" : "America/Chicago";
  }
  if (entry.state === "Nebraska") {
    return entry.longitude <= -101 ? "America/Denver" : "America/Chicago";
  }
  if (entry.state === "North Dakota") {
    return entry.longitude <= -102 ? "America/Denver" : "America/Chicago";
  }
  if (entry.state === "South Dakota") {
    return entry.longitude <= -102 ? "America/Denver" : "America/Chicago";
  }
  if (entry.state === "Idaho") {
    return entry.longitude >= -116 ? "America/Los_Angeles" : "America/Denver";
  }
  if (entry.state === "Oregon") {
    return entry.longitude <= -117 ? "America/Denver" : "America/Los_Angeles";
  }
  if (entry.state === "Kentucky") {
    return entry.longitude <= -86 ? "America/Chicago" : "America/New_York";
  }
  if (entry.state === "Tennessee") {
    return entry.longitude <= -86 ? "America/Chicago" : "America/New_York";
  }
  if (entry.state === "Indiana") {
    return entry.longitude <= -87.5 ? "America/Chicago" : "America/New_York";
  }
  if (entry.state === "Michigan") {
    return entry.longitude <= -88.5 ? "America/Chicago" : "America/New_York";
  }

  return getFallbackTimezoneByLongitude(entry.longitude);
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
