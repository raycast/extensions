import { MenuBarExtra, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import ct from "countries-and-timezones";
import { Timemate } from "./types";
import { getTimemates } from "./utils";

export default function Command() {
  const [timemates, setTimemates] = useState<Timemate[]>([]);

  useEffect(() => {
    async function fetchTimemates() {
      const timemates = await getTimemates();
      setTimemates(timemates);
    }

    fetchTimemates();
  }, []);

  return (
    <MenuBarExtra icon="extension-icon.png" tooltip="Time Mates">
      <MenuBarExtra.Item title="Time Mates" />
      {timemates.length === 0 ? (
        <MenuBarExtra.Item title="No Time Mates available" />
      ) : (
        timemates.map((timemate) => {
          const country = ct.getCountry(timemate.country);
          let time = "Time not available";
          let isDaytime = true;
          let timezoneGap = "Timezone gap not available";

          if (country) {
            const timezone = ct.getTimezone(country.timezones[0]);

            if (timezone) {
              const now = new Date();
              const timezoneOffsetMinutes = now.getTimezoneOffset();
              const offsetDifference = timezone.utcOffset + timezoneOffsetMinutes;

              const timezoneDate = new Date(now.getTime() + offsetDifference * 60 * 1000);
              time = timezoneDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              });

              const hour = timezoneDate.getHours();
              isDaytime = hour >= 6 && hour < 18;

              const localOffset = -timezoneOffsetMinutes / 60;
              const targetOffset = timezone.utcOffset / 60;
              const offsetDifferenceHours = targetOffset - localOffset;

              if (offsetDifferenceHours === 0) {
                timezoneGap = "Same Time";
              } else if (offsetDifferenceHours > 0) {
                timezoneGap = `+${offsetDifferenceHours.toFixed(1)} hrs`;
              } else {
                timezoneGap = `${offsetDifferenceHours.toFixed(1)} hrs`;
              }
            }
          }

          return (
            <MenuBarExtra.Section key={timemate.id}>
              <MenuBarExtra.Item
                title={timemate.name}
                icon={timemate.avatar ? { source: timemate.avatar, fallback: Icon.PersonCircle } : Icon.PersonCircle}
              />
              <MenuBarExtra.Item
                title={`${country?.name || "Unknown Country"}`}
                icon={{
                  source: `https://raw.githubusercontent.com/catamphetamine/country-flag-icons/refs/heads/master/flags/3x2/${country?.id}.svg`,
                }}
              />
              <MenuBarExtra.Item title={`${time} (${timezoneGap}) ${isDaytime ? "☀️" : "🌙"}`} />
            </MenuBarExtra.Section>
          );
        })
      )}
    </MenuBarExtra>
  );
}
