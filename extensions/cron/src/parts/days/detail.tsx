import React, { useEffect, useState } from "react";
import { Detail, Icon } from "@raycast/api";
import getWeather from "u/weather";
import { getCurrentLocation } from "u/getLocation";
import fetch from "node-fetch";

interface DayDetailsProps {
  day: number;
  currentMonth: number;
  currentYear: number;
}

function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

async function getHolidays(year: number, countryCode: string): Promise<unknown[]> {
  const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
  if (!response.ok) {
    throw new Error(`Error fetching holidays: ${response.statusText}`);
  }
  return (await response.json()) as unknown[];
}

export function DayDetails({ day, currentMonth, currentYear }: DayDetailsProps) {
  const [location, setLocation] = useState("Loading location...");
  const [time, setTime] = useState(getCurrentTime());
  const [holidays, setHolidays] = useState<{ name: unknown; date: string }[]>([]);
  const weather = getWeather("default");

  useEffect(() => {
    async function fetchLocationAndHolidays() {
      const loc = await getCurrentLocation();
      setLocation(`${loc.city}, ${loc.countryCode}`);

      const holidays = await getHolidays(currentYear, loc.countryCode);
      setHolidays(holidays as { name: unknown; date: string }[]);
    }
    fetchLocationAndHolidays();
  }, [day, currentMonth, currentYear]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTime(getCurrentTime());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const DATE = `${currentYear}-${currentMonth}-${day}`;

  const filteredHolidays = holidays.filter((holiday) => holiday.date === DATE);

  const showHolidays =
    filteredHolidays.length > 0
      ? `
| Holidays        |
|-----------------|
${filteredHolidays.map((holiday) => `| ${holiday.name} |`).join("\n")}
`
      : "";

  const formattedDate = new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(currentYear, currentMonth - 1, day));

  const SVG_WIDTH = 470;
  const SVG_HEIGHT = 200;

  const svgImage = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}">
    <g transform="translate(0,0)">
      <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" stroke="#fff" stroke-width="2" fill="#fff" rx="12" opacity="0.03"></rect>
      <text x="${SVG_WIDTH / 2}" y="${SVG_HEIGHT / 2 + 4}" fill="#fff" font-family="sans-serif" alignment-baseline="middle" font-size="24" stroke-width="0" stroke="#000" text-anchor="middle">${formattedDate}</text>
    </g>
    </svg>
  `;

  // &nbsp;
  return (
    <Detail
      markdown={`
![Date](data:image/svg+xml;utf8,${encodeURIComponent(svgImage)})

${showHolidays}
`}
      navigationTitle={formattedDate}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label icon={Icon.Clock} title="Time" text={time} />
          <Detail.Metadata.Label icon={Icon.Sun} title="Weather" text={weather?.toString()} />
          <Detail.Metadata.Label icon={Icon.Geopin} title="Location" text={location} />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Link
            title="Calendars"
            target={`https://calendar.google.com/calendar/u/0/r/day/${currentYear}/${currentMonth}/${day}`}
            text="Google Calendar"
          />
          <Detail.Metadata.Link title="" target={`https://cron.re`} text="CR0N" />
        </Detail.Metadata>
      }
    />
  );
}
