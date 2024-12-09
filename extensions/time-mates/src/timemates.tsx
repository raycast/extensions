import { List, ActionPanel, Action, Icon, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import ct from "countries-and-timezones";
import AddTimemate from "./add-timemate";
import UpdateTimeMate from "./update-timemate";
import { Timemate } from "./types";
import { getTimemates, deleteTimemate } from "./utils";

export default function Timemates() {
  const [timemates, setTimemates] = useState<Timemate[]>([]);

  useEffect(() => {
    async function fetchTimemates() {
      const timemates = await getTimemates();
      setTimemates(timemates);
    }

    fetchTimemates();
  }, []);

  return (
    <List>
      {timemates.length === 0 ? (
        <List.EmptyView
          title="No time mate, add time mate now."
          actions={
            <ActionPanel>
              <Action.Push title="Add Time Mate" target={<AddTimemate />} />
            </ActionPanel>
          }
        />
      ) : (
        timemates.map((timemate) => {
          const country = ct.getCountry(timemate.country);
          let timezoneGap = "Timezone gap not available";
          let time = "Time not available";
          let isDaytime = true;

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

              if (offsetDifference === 0) {
                timezoneGap = "Same Time";
              } else if (offsetDifference > 0) {
                timezoneGap = `+${(offsetDifference / 60).toFixed(1)} hrs`;
              } else {
                timezoneGap = `${(offsetDifference / 60).toFixed(1)} hrs`;
              }
            }
          }

          return (
            <List.Item
              key={timemate.id}
              title={timemate.name}
              subtitle={country?.name || "Unknown Country"}
              icon={timemate.avatar ? { source: timemate.avatar, fallback: Icon.PersonCircle } : Icon.PersonCircle}
              accessories={[
                { text: timezoneGap },
                { text: time },
                { icon: isDaytime ? Icon.Sun : Icon.Moon },
                {
                  icon: {
                    source: `https://raw.githubusercontent.com/catamphetamine/country-flag-icons/refs/heads/master/flags/3x2/${country?.id}.svg`,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Update Time Mate"
                    shortcut={{ modifiers: ["cmd"], key: "u" }}
                    target={<UpdateTimeMate timemate={timemate} />}
                    onPop={async () => {
                      const storedTimemates = (await LocalStorage.getItem("timemates")) as string;
                      const timemates = storedTimemates ? JSON.parse(storedTimemates) : [];
                      setTimemates(timemates);
                    }}
                  />
                  <Action
                    title="Delete Time Mate"
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={async () => {
                      await deleteTimemate(timemate.id);
                      setTimemates(timemates.filter((t) => t.id !== timemate.id));
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
