import { Action, ActionPanel, List, Icon } from "@raycast/api";
import groupBy from "lodash.groupby";
import { useState } from "react";
import Matchday from "./components/matchday";
import { useFixtures } from "./hooks";
import { convertToLocalTime } from "./utils";

export default function Fixture() {
  const [competition, setCompetition] = useState<string>("bundesliga");
  const fixtures = useFixtures(competition);

  const categories = fixtures
    ? groupBy(fixtures, (f) =>
        convertToLocalTime(f.plannedKickOff, "EEEE dd-MMM-yyyy")
      )
    : {};

  return (
    <List
      throttle
      isLoading={!fixtures}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Competition"
          value={competition}
          onChange={setCompetition}
        >
          <List.Dropdown.Item title="Bundesliga" value="bundesliga" />
          <List.Dropdown.Item title="2. Bundesliga" value="2bundesliga" />
        </List.Dropdown>
      }
    >
      {Object.entries(categories).map(([day, matches], key) => {
        return (
          <List.Section
            title={`${matches[0].matchdayLabel} - ${day}`}
            key={key}
          >
            {matches.map((match) => {
              const { teams, score, matchStatus } = match;

              return (
                <List.Item
                  key={match.seasonOrder}
                  icon={Icon.Clock}
                  title={convertToLocalTime(match.plannedKickOff, "HH:mm")}
                  subtitle={
                    score
                      ? `${teams.home.nameFull} ${score.home.live} - ${score.away.live} ${teams.away.nameFull}`
                      : `${teams.home.nameFull} - ${teams.away.nameFull}`
                  }
                  accessories={[
                    { text: match.stadiumName },
                    {
                      icon: {
                        source: {
                          dark: match.stadiumIconUrlWhite,
                          light: match.stadiumIconUrlBlack,
                        },
                      },
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      {matchStatus === "PRE_MATCH" ? (
                        <Action.OpenInBrowser
                          title="Buy Ticket"
                          icon={Icon.Wallet}
                          url={teams.home.boxOfficeUrl}
                        />
                      ) : (
                        <Action.Push
                          title="Match Details"
                          icon={Icon.Sidebar}
                          target={<Matchday {...match} />}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
