import { Action, ActionPanel, Color, getPreferenceValues, Icon, Image, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { useBootstrapStatic, useLeague, useUser, useUserTeamByGameweek } from "./hooks";

export default function getUserRankings() {
  const userTeamId = getPreferenceValues().userTeamId;
  const bootstrapData = useBootstrapStatic();
  const [selectedUser, setSelectedUser] = useState<string>(userTeamId);

  const user = useUser(userTeamId);

  const userLeagues = user?.leagues?.classic.filter((league) => league.league_type === "x");

  const [selectedLeague, setSelectedLeague] = useState<string | undefined>(userLeagues?.[0]?.id.toString());

  const [showTeamSummary, setShowTeamSummary] = useState<boolean>(false);

  const league = useLeague(selectedLeague);

  const userTeamByGameweek = useUserTeamByGameweek(selectedUser, user?.current_event);

  const userTeam = useMemo(
    () =>
      userTeamByGameweek?.picks?.map((pick) => {
        const player = bootstrapData?.elements?.find((player) => player.id === pick.element);
        const position = bootstrapData?.element_types?.find(
          (position: { id: number | undefined }) => position.id === player?.element_type
        );

        return {
          ...pick,
          name: player?.web_name,
          team: player?.team,
          positionId: player?.element_type,
          positionName: position?.singular_name_short,
          benched: pick.position > 11,
        };
      }),
    [selectedUser, userTeamByGameweek, bootstrapData]
  );

  return (
    <List
      throttle
      isShowingDetail={showTeamSummary}
      onSelectionChange={() => setShowTeamSummary(false)}
      searchBarAccessory={
        <List.Dropdown tooltip="Select a league" value={selectedLeague} onChange={setSelectedLeague}>
          <List.Dropdown.Section>
            {userLeagues?.map((league) => (
              <List.Dropdown.Item key={league.id} value={league?.id.toString()} title={league.name} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      isLoading={!bootstrapData || !league}
    >
      {(!bootstrapData || !league) && (
        <List.EmptyView
          title="We are currently unable to retrieve your league data."
          description="Sorry, there is currently no league data available to display. Please check the status of the API by visiting fantasy.premierleague.com and try again later."
          icon={Icon.SoccerBall}
        />
      )}

      {league?.standings?.results.map((result) => {
        let icon: Image.ImageLike = {
          source: Icon.Dot,
          tintColor: Color.Brown,
        };

        if (result.rank === 1) {
          icon = {
            source: Icon.Trophy,
            tintColor: Color.Yellow,
          };
        }

        if (result.rank < result.last_rank) {
          icon = {
            source: Icon.ArrowUp,
            tintColor: Color.Green,
          };
        } else if (result.rank > result.last_rank) {
          icon = {
            source: Icon.ArrowDown,
            tintColor: Color.Red,
          };
        }
        return (
          <List.Item
            key={result.entry}
            title={result.rank.toString()}
            keywords={[result.entry_name, result.player_name]}
            subtitle={result.entry_name + " - " + result.player_name}
            accessories={[{ text: result.total.toString() }, { icon }]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Manager Details" />
                    <List.Item.Detail.Metadata.Label title="Name" text={result.player_name} />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Link
                      title="View team on fantasy.premierleague.com"
                      target={`https://fantasy.premierleague.com/entry/${result.entry}/event/${user?.current_event}`}
                      text="Here"
                    />

                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title="Current Starting Team" />
                    <List.Item.Detail.Metadata.Label
                      title="GK"
                      text={userTeam
                        ?.filter((player) => player.positionName === "GKP" && player.benched === false)
                        .map((player) => `${player.name}`)
                        .toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Defence"
                      text={userTeam
                        ?.filter((player) => player.positionName === "DEF" && player.benched === false)
                        .map((player) => ` ${player.name?.split(",")[0]}`)
                        .toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Midfield"
                      text={userTeam
                        ?.filter((player) => player.positionName === "MID" && player.benched === false)
                        .map((player) => ` ${player.name?.split(",")[0]}`)
                        .toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Fowards"
                      text={userTeam
                        ?.filter((player) => player.positionName === "FWD" && player.benched === false)
                        .map((player) => ` ${player.name?.split(",")[0]}`)
                        .toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Bench"
                      text={userTeam
                        ?.filter((player) => player.benched === true)
                        .map((player) => ` ${player.name?.split(",")[0]}`)
                        .toString()}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="View Team Summary"
                  icon={Icon.TwoPeople}
                  onAction={() => {
                    setShowTeamSummary(!showTeamSummary);
                    setSelectedUser(result.entry.toString());
                  }}
                />
                <Action.OpenInBrowser
                  url={`https://fantasy.premierleague.com/entry/${result.entry}/event/${user?.current_event}`}
                  title="View Team on FPL"
                  icon={Icon.Link}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
