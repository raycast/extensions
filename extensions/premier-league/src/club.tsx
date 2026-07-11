import { Action, ActionPanel, Detail, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import json2md from "json2md";
import { useState } from "react";
import { getClubMetadata, getClubs } from "./api";
import SearchBarSeason from "./components/searchbar_season";
import ClubSquad from "./components/squad";
import { Club } from "./types";
import { getClubLogo } from "./utils";

function ClubProfile(props: Club) {
  const { data: metadata } = usePromise(getClubMetadata, [props.id]);
  return (
    <Detail
      navigationTitle={`${props.name} | Club`}
      markdown={json2md([
        { h1: props.name },
        {
          img: {
            source: getClubLogo(props.id),
          },
        },
      ])}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Stadium" text={props.stadium.name} />
          <Detail.Metadata.Label
            title="Capacity"
            text={props.stadium.capacity.toString()}
          />
          <Detail.Metadata.Label
            title="Established"
            text={metadata?.club_established.toString()}
          />
          <Detail.Metadata.Separator />
          {metadata?.club_website && (
            <Detail.Metadata.Link
              title="Website"
              text={metadata.club_website}
              target={metadata.club_website}
            />
          )}
          {metadata?.club_instagram_handle && (
            <Detail.Metadata.Link
              title="Instagram"
              text={metadata.club_instagram_handle}
              target={metadata.club_instagram_handle}
            />
          )}
          {metadata?.club_tiktok_handle && (
            <Detail.Metadata.Link
              title="TikTok"
              text={metadata.club_tiktok_handle}
              target={metadata.club_tiktok_handle}
            />
          )}
          {metadata?.club_x_handle && (
            <Detail.Metadata.Link
              title="X (Twitter)"
              text={metadata.club_x_handle}
              target={metadata.club_x_handle}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Squad"
            icon={Icon.TwoPeople}
            target={<ClubSquad {...props} />}
          />
          <Action.OpenInBrowser
            url={`https://www.premierleague.com/en/clubs/${props.id}/${props.name.replace(/ /g, "-")}/overview`}
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
      columns={4}
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
            subtitle={team.stadium.name}
            content={{
              source: getClubLogo(team.id),
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
