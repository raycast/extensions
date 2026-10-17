import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { TimeStep } from "./types";
import {
  formatTemperature,
  formatWindSpeed,
  formatPrecipitation,
  getWeatherIcon,
} from "./utils";
import { HourDetail } from "./HourDetail";

interface DayHourlyForecastProps {
  date: Date;
  hourlyData: TimeStep[];
  units: {
    temperature: string;
    felttemperature: string;
    precipitation: string;
    windspeed: string;
    sealevelpressure: string;
  };
  locationName: string;
}

export function DayHourlyForecast({
  date,
  hourlyData,
  units,
  locationName,
}: DayHourlyForecastProps) {
  const targetDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  // Filter hourly data for this specific day
  let dayHours = hourlyData.filter((item) => {
    const itemTime = new Date(item.time).getTime();
    return itemTime >= targetDate.getTime() && itemTime < nextDate.getTime();
  });

  // If today, filter forward-looking from current hour
  const now = new Date();
  const isToday =
    targetDate.getFullYear() === now.getFullYear() &&
    targetDate.getMonth() === now.getMonth() &&
    targetDate.getDate() === now.getDate();

  if (isToday) {
    const currentHourStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
    ).getTime();
    dayHours = dayHours.filter(
      (item) => new Date(item.time).getTime() >= currentHourStart,
    );
  }

  const dateStr = date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <List navigationTitle={`${dateStr} - ${locationName}`}>
      <List.Section
        title={`${isToday ? "Today" : dateStr} - ${locationName}`}
        subtitle={`${dayHours.length} hours`}
      >
        {dayHours.length > 0 ? (
          dayHours.map((item, index) => {
            const itemDate = new Date(item.time);
            const timeStr = itemDate.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const label =
              isToday && index === 0
                ? "Now"
                : itemDate.toLocaleDateString([], {
                    weekday: "short",
                  });

            return (
              <List.Item
                key={item.time}
                title={`${label} ${timeStr}`}
                subtitle={`${formatTemperature(item.temperature, units.temperature)} • ${formatPrecipitation(item.precipitation, units.precipitation)} • ${formatWindSpeed(item.windspeed, units.windspeed)}`}
                icon={getWeatherIcon(item.pictocode)}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Details"
                      icon={Icon.Info}
                      target={<HourDetail item={item} units={units} />}
                    />
                  </ActionPanel>
                }
              />
            );
          })
        ) : (
          <List.Item
            title="No hourly data available for this day"
            icon={Icon.ExclamationMark}
          />
        )}
      </List.Section>
    </List>
  );
}
