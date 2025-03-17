import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { formatDate } from "date-fns";
import json2md from "json2md";
import { Team } from "../types";
import ClubSquad from "./squad";

export default function ClubProfile(team: Team) {
  const { club, venue } = team;

  return (
    <Detail
      navigationTitle={`${club.nickname} | Club`}
      markdown={json2md([
        { h1: club.name },
        { p: club.address ?? "" },
        venue.image
          ? {
              img: {
                source: venue.image.url,
                title: venue.name,
              },
            }
          : { img: [] },
      ])}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Year of foundation"
            text={team.foundation ? formatDate(team.foundation, "yyyy") : ""}
          />

          <Detail.Metadata.TagList title="Club Colors">
            <Detail.Metadata.TagList.Item text={team.color} color={team.color} />
            {team.color_secondary && (
              <Detail.Metadata.TagList.Item text={team.color_secondary} color={team.color_secondary} />
            )}
          </Detail.Metadata.TagList>

          <Detail.Metadata.Label title="President" text={club.president} />
          <Detail.Metadata.Label title="Stadium" text={venue.name} />

          <Detail.Metadata.Link title="Official Website" text={club.web} target={club.web} />
          <Detail.Metadata.Separator />
          {club.twitter && (
            <Detail.Metadata.Link
              title="Twitter"
              text={club.twitter}
              target={`https://twitter.com/${club.twitter.replace("@", "")}`}
            />
          )}
          {club.facebook && <Detail.Metadata.Link title="Facebook" text={club.facebook} target={club.facebook} />}
          {club.instagram && <Detail.Metadata.Link title="Instagram" text={club.instagram} target={club.instagram} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push title="Squad" icon={Icon.TwoPeople} target={<ClubSquad {...team} />} />
          <Action.OpenInBrowser url={`https://www.laliga.com/en-GB/clubs/${team.slug}`} />
        </ActionPanel>
      }
    />
  );
}
