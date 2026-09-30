import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import json2md from "json2md";
import { getClub } from "../api";
import ClubSquad from "./squad";

export default function ClubDetails(props: {
  url: string;
  season: string;
  team_name: string;
}) {
  const { data: club, isLoading } = usePromise(
    (url) => getClub(url.replace("/team/", "")),
    [props.url],
  );

  return club ? (
    <Detail
      navigationTitle={`${club.name} | Club`}
      isLoading={isLoading}
      markdown={json2md([
        { h1: club.business_name },
        { p: club.address || "" },
        {
          img: {
            source: `${club.image_url}/${club.logo}`,
            title: club.name,
          },
        },
      ])}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link
            title="Official Website"
            text={club.website.trim()}
            target={club.website.trim()}
          />
          <Detail.Metadata.Label
            title="Phone"
            icon={Icon.Phone}
            text={club.phone_number}
          />
          <Detail.Metadata.Label
            title="Fax"
            icon={Icon.Print}
            text={club.fax}
          />
          <Detail.Metadata.Separator />
          {club.twitter_url && (
            <Detail.Metadata.Link
              title="Twitter"
              text={club.twitter_url.trim()}
              target={`https://twitter.com/${club.twitter_url.trim()}`}
            />
          )}
          {club.facebook_url && (
            <Detail.Metadata.Link
              title="Facebook"
              text={club.facebook_url.trim()}
              target={club.facebook_url.trim()}
            />
          )}
          {club.instagram_url && (
            <Detail.Metadata.Link
              title="Instagram"
              text={club.instagram_url.trim()}
              target={club.instagram_url.trim()}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Squad"
            icon={Icon.TwoPeople}
            target={<ClubSquad {...props} netco_id={club.netco_id} />}
          />
          <Action.OpenInBrowser title="Website" url={club.website} />
          <Action.OpenInBrowser
            title="Ticket"
            icon={Icon.Wallet}
            url={club.ticket_url}
          />
          <Action.OpenInBrowser
            title="Shop"
            icon={Icon.Store}
            url={club.shop_url}
          />
        </ActionPanel>
      }
    />
  ) : (
    <Detail navigationTitle={`${props.team_name} | Club`} />
  );
}
