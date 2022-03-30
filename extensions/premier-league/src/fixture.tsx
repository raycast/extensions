import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import groupBy from "lodash.groupby";
import { format, parse } from "date-fns";
import { useFixtures, useSeasons, useTeams } from "./hooks";

export default function Fixture() {
  const season = useSeasons();
  const club = useTeams(season.seasons[0]?.id.toString());

  const [page, setPage] = useState<number>(0);
  const [teams, setTeams] = useState<string>("-1");

  const fixture = useFixtures({
    teams,
    page,
    sort: "asc",
    statuses: "U,L",
  });

  const loading = [season.loading, club.loading, fixture.loading].some(
    (i) => i
  );
  const categories = groupBy(
    fixture.fixtures,
    (f) => f.kickoff.label?.split(",")[0]
  );

  return (
    <List
      throttle
      isLoading={loading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Club" onChange={setTeams}>
          <List.Dropdown.Section>
            {club.clubs.map((club) => {
              return (
                <List.Dropdown.Item
                  key={club.value}
                  value={club.value}
                  title={club.title}
                />
              );
            })}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {Object.entries(categories).map(([label, matches]) => {
        return (
          <List.Section
            key={label}
            title={label === "undefined" ? "Date To Be Confirmed" : label}
          >
            {matches.map((match) => {
              const label = match.kickoff.label
                ?.replace("BST", "+01:00")
                .replace("GMT", "+00:00");
              const kickoff = label
                ? format(
                    parse(label, "EEE d MMM yyyy, HH:mm XXX", new Date()),
                    "HH:mm"
                  )
                : "TBC";

              return (
                <List.Item
                  key={match.id}
                  title={kickoff}
                  subtitle={`${match.teams[0].team.name} - ${match.teams[1].team.name}`}
                  icon={Icon.Clock}
                  accessories={[
                    { text: `${match.ground.name}, ${match.ground.city}` },
                    { icon: "stadium.svg" },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        url={`https://www.premierleague.com/match/${match.id}`}
                      />
                      {!fixture.lastPage && (
                        <Action
                          title="Load More"
                          icon={Icon.MagnifyingGlass}
                          onAction={() => {
                            setPage(page + 1);
                          }}
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
