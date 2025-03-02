import { Detail, List, Color, Action, ActionPanel, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Athlete {
  shortName: string;
}

interface Competitor {
  athlete: Athlete;
}

interface Status {
  type: {
    state: string;
    completed?: boolean;
  };
  period?: number;
  displayClock?: string;
}

interface Competition {
  competitors: Competitor[];
  status: Status;
}

interface Race {
  id: string;
  shortName: string;
  name: string;
  date: string;
  status: Status;
  circuit: {
    address: {
      city: string;
      country: string;
    };
  };
  competitions: Competition[];
  links: { href: string }[];
}

interface DayItems {
  title: string;
  races: JSX.Element[];
}

interface Response {
  events: Race[];
  day: { date: string };
  leagues: { logos: { href: string }[] }[];
}
export default function command() {
  // Fetch F1 Races

  const currentYear = new Date().getFullYear();

  const { isLoading, data } = useFetch<Response>(
    `https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard?dates=${currentYear}`,
  );

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!data) {
    return <Detail markdown="No data found." />;
  }

  const f1DayItems: DayItems[] = [];
  const f1Races = data?.events || [];

  f1Races.forEach((race, index) => {
    const gameDate = new Date(race.date);
    const f1RaceDay = gameDate.toLocaleDateString([], {
      dateStyle: "medium",
    });

    if (!f1DayItems.find((f1Day) => f1Day.title === f1RaceDay)) {
      f1DayItems.push({
        title: f1RaceDay,
        races: [],
      });
    }

    const f1Day = f1DayItems.find((f1Day) => f1Day.title === f1RaceDay);

    const gameTime = new Date(race.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryIcon = { source: Icon.Calendar, tintColor: Color.SecondaryText };
    let accessoryToolTip = "Scheduled";

    if (race.status.type.state === "in") {
      accessoryTitle = `${race.competitions[4].competitors[0].athlete.shortName}     L${race.competitions[4].status.period} ${race.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryIcon = { source: Icon.Livestream, tintColor: Color.Green };
      accessoryToolTip = "Current Leader & Lap";
    }

    if (race.status.type.state === "post") {
      accessoryTitle = `${race.competitions[4].competitors[0].athlete.shortName}`;
      accessoryColor = Color.SecondaryText;
      accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
      accessoryToolTip = "Winner";
    }

    if (race.status.type.state === "post" && race.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryIcon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
      accessoryColor = Color.Orange;
    }

    f1Day?.races.push(
      <List.Item
        key={index}
        title={`${race.name}`}
        subtitle={`${race.circuit.address.city}, ${race.circuit.address.country}`}
        icon={{ source: data.leagues[0].logos[0].href }}
        accessories={[
          { tag: { value: (index + 1).toString(), color: Color.Green }, icon: Icon.Flag },
          {
            text: { value: `${accessoryTitle}`, color: accessoryColor },
            tooltip: accessoryToolTip,
          },
          { icon: accessoryIcon },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Race Details on ESPN" url={`${race.links[0].href}`} />
            <Action.OpenInBrowser title="View Circuit Details on ESPN" url={`${race.links[2].href}`} />
          </ActionPanel>
        }
      />,
    );
  });

  f1DayItems.sort((a, b) => {
    const dateA = new Date(a.title);
    const dateB = new Date(b.title);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <List searchBarPlaceholder="Search for an upcoming race" isLoading={isLoading}>
      {f1DayItems.map((f1Day, index) => (
        <List.Section
          key={index}
          title={`${f1Day.title}`}
          subtitle={`${f1Day.races.length} Race${f1Day.races.length !== 1 ? "s" : ""}`}
        >
          {f1Day.races}
        </List.Section>
      ))}
    </List>
  );
}
