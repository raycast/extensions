// @ts-nocheck
import React, { useState, useEffect } from "react";
import { List, Action, ActionPanel, Clipboard } from "@raycast/api";
// import { format } from "date-fns"; // Unused for now
import { utcToZonedTime, format as formatTz } from "date-fns-tz";

interface WorldClockItem {
  name: string;
  timezone: string;
  time: string;
  date: string;
  offset: string;
}

const worldTimezones = [
  { name: "🇺🇸 New York", timezone: "America/New_York" },
  { name: "🇺🇸 Los Angeles", timezone: "America/Los_Angeles" },
  { name: "🇺🇸 Chicago", timezone: "America/Chicago" },
  { name: "🇺🇸 Denver", timezone: "America/Denver" },
  { name: "🇬🇧 London", timezone: "Europe/London" },
  { name: "🇫🇷 Paris", timezone: "Europe/Paris" },
  { name: "🇩🇪 Berlin", timezone: "Europe/Berlin" },
  { name: "🇯🇵 Tokyo", timezone: "Asia/Tokyo" },
  { name: "🇦🇺 Sydney", timezone: "Australia/Sydney" },
  { name: "🇮🇳 Mumbai", timezone: "Asia/Kolkata" },
  { name: "🇨🇳 Shanghai", timezone: "Asia/Shanghai" },
  { name: "🇧🇷 São Paulo", timezone: "America/Sao_Paulo" },
  { name: "🌍 UTC", timezone: "UTC" },
];

export default function WorldClock() {
  const [clockData, setClockData] = useState<WorldClockItem[]>([]);

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      const newClockData = worldTimezones.map((tz) => {
        const zonedTime = utcToZonedTime(now, tz.timezone);

        return {
          name: tz.name,
          timezone: tz.timezone,
          time: formatTz(zonedTime, "h:mm:ss a", { timeZone: tz.timezone }),
          date: formatTz(zonedTime, "MMM d, yyyy", { timeZone: tz.timezone }),
          offset: formatTz(zonedTime, "xxx", { timeZone: tz.timezone }),
        };
      });

      setClockData(newClockData);
    };

    // Update immediately
    updateTimes();

    // Update every second
    const interval = setInterval(updateTimes, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    // @ts-ignore
    <List isLoading={clockData.length === 0}>
      {clockData.map((item) => (
        <List.Item
          key={item.timezone}
          title={item.name}
          subtitle={item.time}
          accessories={[{ text: item.date }, { text: item.offset }]}
          actions={
            <ActionPanel>
              <Action
                title="Copy Time"
                onAction={() =>
                  Clipboard.copy(`${item.name}: ${item.time} (${item.date})`)
                }
              />
              <Action
                title="Copy Timezone"
                onAction={() => Clipboard.copy(item.timezone)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
