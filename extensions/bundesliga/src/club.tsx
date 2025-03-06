import { Action, ActionPanel, Detail, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import json2md from "json2md";
import { useState } from "react";
import { getClubs } from "./api";
import ClubPersons from "./components/clubpersons";
import { Club } from "./types";

function ClubProfile(props: { team: Club; competition: string }) {
  const { team, competition } = props;
  return (
    <Detail
      navigationTitle={`${team.name.full} | Club`}
      markdown={json2md([{ img: { source: team.logos[0].uri } }])}
      metadata={
        team && (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Full Name"
              text={team.name.withFormOfCompany}
            />
            <Detail.Metadata.Label title="Founded" text={team.founded} />
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
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Street" text={team.contact.street} />
            <Detail.Metadata.Label title="City" text={team.contact.city} />
            <Detail.Metadata.Link
              title="Directions"
              text="Open with maps"
              target={team.stadium.mapsUrl}
            />
            <Detail.Metadata.Label title="Phone" text={team.contact.phone} />
            <Detail.Metadata.Label title="Fax" text={team.contact.fax} />

            <Detail.Metadata.Link
              title="Website"
              text={team.contact.homepage}
              target={team.contact.homepage}
            />
            <Detail.Metadata.Link
              title="Email"
              text={team.contact.email}
              target={`mailto:${team.contact.email}`}
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
              icon={Icon.TwoPeople}
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

export default function Clubs() {
  const [competition, setCompetition] = useState<string>("bundesliga");

  const { data: clubs, isLoading } = usePromise(getClubs, []);

  return (
    <Grid
      throttle
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by Competition"
          value={competition}
          onChange={setCompetition}
        >
          <Grid.Dropdown.Item
            title="Bundesliga"
            value="bundesliga"
            icon="bundesliga.svg"
          />
          <Grid.Dropdown.Item
            title="2. Bundesliga"
            value="2bundesliga"
            icon="2bundesliga.svg"
          />
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
                  target={<ClubProfile team={team} competition={competition} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
