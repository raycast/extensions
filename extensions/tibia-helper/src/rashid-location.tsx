import { List, Icon, Color } from "@raycast/api";

interface RashidLocation {
  day: string;
  city: string;
  location: string;
}

const RASHID_SCHEDULE: RashidLocation[] = [
  {
    day: "Monday",
    city: "Svargrond",
    location: "Dankwart's tavern, south of the temple",
  },
  {
    day: "Tuesday",
    city: "Liberty Bay",
    location: "Lyonel's tavern, west of the depot",
  },
  {
    day: "Wednesday",
    city: "Port Hope",
    location: "Clyde's tavern, west of the depot",
  },
  {
    day: "Thursday",
    city: "Ankrahmun",
    location: "Arito's tavern, above the post office",
  },
  {
    day: "Friday",
    city: "Darashia",
    location: "Miraia's tavern, south of the guildhalls",
  },
  {
    day: "Saturday",
    city: "Edron",
    location: "Mirabell's tavern, above the depot",
  },
  { day: "Sunday", city: "Carlin", location: "Depot, one floor above" },
];

function getRashidLocation(): {
  current: RashidLocation;
  next: RashidLocation;
  timeUntilMove: string;
} {
  // Get current time in CET/CEST (Europe/Berlin timezone)
  const now = new Date();
  const cetTime = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Europe/Berlin",
    }),
  );

  // Get the day of week (0 = Sunday, 1 = Monday, etc.)
  let dayIndex = cetTime.getDay();
  const currentHour = cetTime.getHours();

  // Rashid moves at 10:00 CET/CEST each day
  // If it's before 10:00, he's still in yesterday's city
  if (currentHour < 10) {
    dayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  }

  // Convert Sunday (0) to index 6, Monday (1) to 0, etc.
  const scheduleIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  const nextIndex = (scheduleIndex + 1) % 7;

  const current = RASHID_SCHEDULE[scheduleIndex];
  const next = RASHID_SCHEDULE[nextIndex];

  // Calculate time until next move (next day at 10:00 CET)
  const nextMove = new Date(cetTime);
  nextMove.setHours(10, 0, 0, 0);
  if (currentHour >= 10) {
    nextMove.setDate(nextMove.getDate() + 1);
  }

  const hoursUntil = Math.floor(
    (nextMove.getTime() - cetTime.getTime()) / (1000 * 60 * 60),
  );
  const minutesUntil = Math.floor(
    ((nextMove.getTime() - cetTime.getTime()) % (1000 * 60 * 60)) / (1000 * 60),
  );

  const timeUntilMove = `${hoursUntil}h ${minutesUntil}m`;

  return { current, next, timeUntilMove };
}

export default function Command() {
  const { current, next, timeUntilMove } = getRashidLocation();

  return (
    <List>
      <List.Section title="Current Location">
        <List.Item
          title={current.city}
          subtitle={current.location}
          accessories={[
            {
              text: current.day,
              icon: { source: Icon.Calendar, tintColor: Color.Green },
            },
            {
              tag: { value: "Current", color: Color.Green },
            },
          ]}
          icon={{ source: Icon.Pin, tintColor: Color.Green }}
        />
      </List.Section>

      <List.Section title="Next Location">
        <List.Item
          title={next.city}
          subtitle={next.location}
          accessories={[
            {
              text: `in ${timeUntilMove}`,
              icon: { source: Icon.Clock, tintColor: Color.Blue },
            },
            {
              text: next.day,
              icon: Icon.Calendar,
            },
          ]}
          icon={{ source: Icon.Pin, tintColor: Color.Blue }}
        />
      </List.Section>

      <List.Section title="Weekly Schedule">
        {RASHID_SCHEDULE.map((location, index) => {
          const isCurrent = location.day === current.day;
          return (
            <List.Item
              key={index}
              title={location.city}
              subtitle={location.location}
              accessories={[
                {
                  text: location.day,
                  icon: Icon.Calendar,
                },
                ...(isCurrent
                  ? [{ tag: { value: "Now", color: Color.Green } }]
                  : []),
              ]}
              icon={
                isCurrent
                  ? { source: Icon.Pin, tintColor: Color.Green }
                  : Icon.Pin
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
