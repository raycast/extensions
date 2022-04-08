import { Action, ActionPanel, List } from "@raycast/api";
import { useState } from "react";
import { useFixtures } from "./hooks";

export default function Fixture() {
  const [competition, setCompetition] = useState<string>("bundesliga");
  const fixtures = useFixtures(competition);

  return (
    <List
      throttle
      isLoading={!fixtures}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Competition"
          onChange={setCompetition}
        >
          <List.Dropdown.Item title="Bundesliga" value="bundesliga" />
          <List.Dropdown.Item title="2. Bundesliga" value="2bundesliga" />
        </List.Dropdown>
      }
    >
      <List.Section title={fixtures && fixtures[0]?.matchdayLabel}>
        {fixtures?.map((fixture) => {
          const { teams, score } = fixture;

          return (
            <List.Item
              key={fixture.seasonOrder}
              title={
                score
                  ? `${teams.home.nameFull} ${score.home.live} - ${score.away.live} ${teams.away.nameFull}`
                  : `${teams.home.nameFull} - ${teams.away.nameFull}`
              }
              accessories={[
                { text: fixture.stadiumName },
                {
                  icon: {
                    source: {
                      dark: fixture.stadiumIconUrlWhite,
                      light: fixture.stadiumIconUrlBlack,
                    },
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={`https://www.bundesliga.com/en/${competition}/matchday/2021-2022/${fixture.matchday}/${fixture.slugs.slugLong}`}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
