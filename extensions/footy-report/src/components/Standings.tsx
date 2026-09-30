import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { useFetchStandings, useFetchTeams } from "@src/hooks";
import { useEffect, useState } from "react";
import TeamDetails from "@src/components/TeamDetails";

const Standings = ({ seasonId }: { seasonId: string }) => {
  const { push } = useNavigation();
  const [teamName, setTeamName] = useState<string>("");
  const { data: standings, isLoading } = useFetchStandings(seasonId);
  const { data: teamsFound, isLoading: isTeamLoading } = useFetchTeams(
    teamName,
    {
      image_path: true,
    },
  );

  useEffect(() => {
    if (teamsFound.length > 0 && !isTeamLoading) {
      const [team] = teamsFound;
      push(<TeamDetails team={team} />);
    }
  }, [JSON.stringify(teamsFound)]);

  return (
    <List
      searchBarPlaceholder={"Search team"}
      isLoading={isLoading || isTeamLoading}
    >
      {standings.length === 0 ? (
        <List.EmptyView title="No League Standings Found!" />
      ) : (
        standings.map((standing) => {
          return (
            <List.Item
              title={standing.position.toString()}
              icon={{ source: standing.img_path }}
              key={standing.name}
              subtitle={standing.name}
              keywords={[standing.name]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Team Details"
                    onAction={() => {
                      setTeamName(standing.name);
                    }}
                  />
                </ActionPanel>
              }
              accessories={[
                {
                  text: {
                    value: `PL: ${standing.played}`,
                    color: Color.Orange,
                  },
                },
                {
                  text: { value: `W: ${standing.wins}`, color: Color.Green },
                },
                {
                  text: {
                    value: `D: ${standing.draws}`,
                    color: Color.SecondaryText,
                  },
                },
                {
                  text: { value: `L: ${standing.losses}`, color: Color.Red },
                },
                {
                  text: { value: `PTS: ${standing.points}`, color: Color.Blue },
                },
                ...standing.recentForm.map((form) => {
                  const tintColor =
                    form.result === "W"
                      ? Color.Green
                      : form.result === "D"
                      ? Color.SecondaryText
                      : Color.Red;
                  return {
                    icon: { source: Icon.CircleFilled, tintColor },
                    tooltip: form.name,
                  };
                }),
              ]}
            />
          );
        })
      )}
    </List>
  );
};

export default Standings;
