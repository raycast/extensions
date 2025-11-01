import { Action, ActionPanel, Detail, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import json2md from "json2md";
import { useState } from "react";
import { getClubs } from "./api";
import SearchBarSeason from "./components/searchbar_season";
import ClubSquad from "./components/squad";
import { Team } from "./types";
import { getClubLogo } from "./utils";

function ClubProfile(props: Team) {
  const { metadata } = props;
  return (
    <Detail
      navigationTitle={`${props.name} | Club`}
      markdown={json2md([
        { h1: props.name },
        {
          img: {
            source: getClubLogo(props.altIds.opta),
          },
        },
      ])}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Stadium" text={props.grounds[0].name} />
          <Detail.Metadata.Label
            title="Capacity"
            text={props.grounds[0].capacity?.toString()}
          />

          <Detail.Metadata.Separator />
          {metadata.communities_twitter && (
            <Detail.Metadata.Link
              title="Twitter"
              text={metadata.communities_twitter}
              target={metadata.communities_twitter}
            />
          )}
          {metadata.communities_facebook && (
            <Detail.Metadata.Link
              title="Facebook"
              text={metadata.communities_facebook}
              target={metadata.communities_facebook}
            />
          )}
          {metadata.communities_instagram && (
            <Detail.Metadata.Link
              title="Instagram"
              text={metadata.communities_instagram}
              target={metadata.communities_instagram}
            />
          )}
          {metadata.communities_youtube && (
            <Detail.Metadata.Link
              title="YouTube"
              text={metadata.communities_youtube}
              target={metadata.communities_youtube}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Squad"
            icon={Icon.TwoPeople}
            target={<ClubSquad {...props.club} />}
          />
          <Action.OpenInBrowser
            url={`https://www.premierleague.com/clubs/${
              props.id
            }/${props.name.replace(/ /g, "-")}/overview`}
          />
        </ActionPanel>
      }
    />
  );
}

export default function EPLClub() {
  const [seasonId, setSeasonId] = useState<string>();

  const { data: clubs, isLoading } = usePromise(
    async (season) => (season ? await getClubs(season) : undefined),
    [seasonId],
  );

  return (
    <Grid
      throttle
      isLoading={isLoading}
      inset={Grid.Inset.Small}
      searchBarAccessory={
        <SearchBarSeason selected={seasonId} onSelect={setSeasonId} />
      }
    >
      {clubs?.map((team) => {
        return (
          <Grid.Item
            key={team.id}
            title={team.name}
            subtitle={team.grounds[0].name}
            content={{
              source: getClubLogo(team.altIds.opta),
              fallback: "default.png",
            }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Club Profile"
                  icon={Icon.Sidebar}
                  target={<ClubProfile {...team} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
