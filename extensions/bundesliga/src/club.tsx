import { Action, ActionPanel, Detail, Icon, Grid } from "@raycast/api";
import json2md from "json2md";
import { useState } from "react";
import ClubPersons from "./components/clubpersons";
import { useClubs } from "./hooks";
import { Club } from "./types";

function ClubDetails(props: { team: Club; competition: string }) {
  const { team, competition } = props;
  return (
    <Detail
      navigationTitle={`${team.name.full} | Club`}
      markdown={json2md([
        { h1: team.name.withFormOfCompany },
        {
          p: [
            `Street: ${team.contact.street}`,
            `City: ${team.contact.city}`,
            `Directions: [Open with maps](${team.stadium.mapsUrl})`,
            `Phone: ${team.contact.phone}`,
            `Fax: ${team.contact.fax}`,
          ],
        },
        { img: { source: team.logos[0].uri } },
      ])}
      metadata={
        team && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Founded" text={team.founded} />
            <Detail.Metadata.TagList title="Club Colors">
              <Detail.Metadata.TagList.Item
                color={team.colors.club.primary.hex}
                text={team.colors.club.primary.hex}
              />
              <Detail.Metadata.TagList.Item
                color={team.colors.club.secondary.hex}
                text={team.colors.club.secondary.hex}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label
              title="Stadium"
              text={team.stadium.name}
              icon={{
                source: {
                  dark: team.stadium.stadiumIconUrlWhite,
                  light: team.stadium.stadiumIconUrlBlack,
                },
              }}
            />
            <Detail.Metadata.Label
              title="Capacity"
              text={team.stadium.capacity}
            />
            <Detail.Metadata.Link
              title="Website"
              text={team.contact.homepage}
              target={team.contact.homepage}
            />
            <Detail.Metadata.Separator />
            {team.contact.twitter && (
              <Detail.Metadata.Link
                title="Twitter"
                text={team.contact.twitter}
                target={team.contact.twitter}
              />
            )}
            {team.contact.facebook && (
              <Detail.Metadata.Link
                title="Facebook"
                text={team.contact.facebook}
                target={team.contact.facebook}
              />
            )}
            {team.contact.instagram && (
              <Detail.Metadata.Link
                title="Instagram"
                text={team.contact.instagram}
                target={team.contact.instagram}
              />
            )}
          </Detail.Metadata>
        )
      }
      actions={
        team && (
          <ActionPanel>
            <Action.Push
              title="Squad"
              icon={Icon.Person}
              target={
                <ClubPersons
                  navigationTitle={`Squad | ${team.name.full} | Club`}
                  club={team.id}
                />
              }
            />
            <Action.OpenInBrowser
              url={`https://www.bundesliga.com/en/${competition}/clubs/${team.name.slugifiedFull}`}
            />
          </ActionPanel>
        )
      }
    />
  );
}

export default function Club() {
  const [competition, setCompetition] = useState<string>("bundesliga");
  const clubs = useClubs();

  return (
    <Grid
      throttle
      isLoading={!clubs}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by Competition"
          value={competition}
          onChange={setCompetition}
        >
          <Grid.Dropdown.Item title="Bundesliga" value="bundesliga" />
          <Grid.Dropdown.Item title="2. Bundesliga" value="2bundesliga" />
        </Grid.Dropdown>
      }
    >
      {((clubs && clubs[competition]) || []).map((team) => {
        return (
          <Grid.Item
            key={team.id}
            title={team.name.full}
            subtitle={team.stadium.name}
            content={{
              source: `https://www.bundesliga.com/assets/clublogo/${team.id}.svg`,
              // source: team.logos[0].uri,
              fallback: "default_clublogo.svg",
            }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  icon={Icon.Sidebar}
                  target={<ClubDetails team={team} competition={competition} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
