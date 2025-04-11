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
  competitions: Competition[];
  links: { href: string }[];
}

interface Response {
  events: Race[];
  day: { date: string };
  leagues: { logos: { href: string }[] }[];
}
export default function command() {
  const { isLoading, data } = useFetch<Response>("https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard");

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!data) {
    return <Detail markdown="No data found." />;
  }

  const races = data?.events || [];
  const raceItems: JSX.Element[] = [];

  races.forEach((race, index) => {
    const gameTime = new Date(race.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryToolTip;
    let accessoryIcon;

    if (race.status.type.state === "in") {
      accessoryTitle = `${race.competitions[4].competitors[0].athlete.shortName}     L${race.competitions[4].status.period} ${race.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryIcon = { source: Icon.Stars, tintColor: "Green" };
      accessoryToolTip = "Current Leader & Lap";
    }

    if (race.status.type.state === "post") {
      accessoryTitle = `${race.competitions[4].competitors[0].athlete.shortName}`;
      accessoryColor = Color.SecondaryText;
      accessoryIcon = { source: Icon.Trophy, tintColor: "gold" };
      accessoryToolTip = "Winner";
    }

    if (race.status.type.state === "post" && race.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryColor = Color.Orange;
    }

    raceItems.push(
      <List.Item
        key={index}
        title={`${race.shortName}`}
        icon={{ source: data.leagues[0].logos[0].href }}
        accessories={[
          {
            text: { value: `${accessoryTitle}`, color: accessoryColor },
            tooltip: accessoryToolTip,
            icon: accessoryIcon,
          },
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

  return (
    <List searchBarPlaceholder="Search for an upcoming race" isLoading={isLoading}>
      <List.Section
        title={`${data.day.date}`}
        subtitle={`${raceItems.length} Race${raceItems.length !== 1 ? "s" : ""}`}
      >
        {raceItems}
      </List.Section>
    </List>
  );
}
