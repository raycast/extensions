import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail } from "@raycast/api";
import json2md from "json2md";
import { getTeam } from "../api";
import { Team } from "../types/club";
import { format } from "date-fns";

export default function ClubDetails(props: { slug: string }) {
  const [loading, setLoading] = useState<boolean>(false);
  const [team, setTeam] = useState<Team | undefined>(undefined);

  useEffect(() => {
    setLoading(true);
    getTeam(props.slug).then((data) => {
      setTeam(data);
      setLoading(false);
    });
  }, [props.slug]);

  return (
    <Detail
      isLoading={loading}
      markdown={
        team
          ? json2md([
              { h1: team.name },
              { p: team.club.address },
              team.venue.image
                ? {
                    img: {
                      source: team.venue.image.url,
                      title: team.venue.name,
                    },
                  }
                : { img: [] },
            ])
          : undefined
      }
      metadata={
        team && (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Year of foundation"
              text={
                team.foundation ? format(new Date(team.foundation), "yyyy") : ""
              }
            />

            <Detail.Metadata.Label
              title="President"
              text={team.club.president}
            />

            <Detail.Metadata.Label title="Stadium" text={team.venue.name} />
            <Detail.Metadata.Link
              title="Official Website"
              text={team.web}
              target={team.web}
            />
            <Detail.Metadata.Separator />
            {team.twitter && (
              <Detail.Metadata.Link
                title="Twitter"
                text={team.twitter}
                target={`https://twitter.com/${team.twitter.replace("@", "")}`}
              />
            )}
            {team.facebook && (
              <Detail.Metadata.Link
                title="Facebook"
                text={team.facebook}
                target={team.facebook}
              />
            )}
            {team.instagram && (
              <Detail.Metadata.Link
                title="Instagram"
                text={team.instagram}
                target={team.instagram}
              />
            )}
          </Detail.Metadata>
        )
      }
      actions={
        team && (
          <ActionPanel>
            <Action.OpenInBrowser
              url={`https://www.laliga.com/en-GB/clubs/${team.slug}`}
            />
          </ActionPanel>
        )
      }
    />
  );
}
