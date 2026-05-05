import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { formatDate } from "date-fns";
import json2md from "json2md";
import { Team } from "../types";
import ClubSquad from "./squad";
import { getTeam } from "../api";

export default function ClubProfile(team: Team) {
  const { venue } = team;

  const { data, isLoading } = usePromise(getTeam, [team.slug]);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${team.nickname} | Club`}
      markdown={json2md([
        { h1: team.name },
        { p: team.address ?? "" },
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

          <Detail.Metadata.Label title="President" text={data?.club.president} />
          <Detail.Metadata.Label title="Stadium" text={venue.name} />

          <Detail.Metadata.Link title="Official Website" text={team.web} target={team.web} />
          <Detail.Metadata.Separator />
          {data?.club.twitter && (
            <Detail.Metadata.Link
              title="Twitter"
              text={data?.club.twitter}
              target={`https://twitter.com/${data?.club.twitter.replace("@", "")}`}
            />
          )}
          {data?.club.facebook && (
            <Detail.Metadata.Link title="Facebook" text={data?.club.facebook} target={data?.club.facebook} />
          )}
          {data?.club.instagram && (
            <Detail.Metadata.Link title="Instagram" text={data?.club.instagram} target={data?.club.instagram} />
          )}
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
