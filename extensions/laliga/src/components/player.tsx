import { Action, ActionPanel, Detail } from "@raycast/api";
import { formatDate } from "date-fns";
import json2md from "json2md";
import { Squad } from "../types";

export const getFlagEmoji = (isoCode?: string) => {
  if (!isoCode) return "🏴";

  if (isoCode === "GB-ENG") {
    return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
  }
  if (isoCode === "GB-WLS") {
    return "🏴󠁧󠁢󠁷󠁬󠁳󠁿";
  }
  if (isoCode === "GB-SCT") {
    return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
  }
  if (isoCode === "GB-NIR") {
    // The only official flag in Northern Ireland is the Union Flag of the United Kingdom.
    return "🇬🇧";
  }

  return isoCode.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
};

export default function Player(squad: Squad) {
  return (
    <Detail
      navigationTitle={`${squad.person.name} | Profile & Stats`}
      markdown={json2md([
        { h1: squad.person.name },
        {
          img: {
            source: squad.photos["001"]["512x556"],
          },
        },
      ])}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Nationality"
            icon={getFlagEmoji(squad.person.country?.id)}
            text={squad.person.country?.id}
          />
          <Detail.Metadata.Label title="Date of Birth" text={formatDate(squad.person.date_of_birth, "dd/MM/yyyy")} />
          <Detail.Metadata.Label title="Place of Birth" text={squad.person.place_of_birth} />
          <Detail.Metadata.Label title="Height" text={`${squad.person.height}cm`} />
          <Detail.Metadata.Label title="Weight" text={`${squad.person.weight}kg`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Position" text={squad.position.name} />
          <Detail.Metadata.Label title="Shirt Number" text={squad.shirt_number?.toString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://www.laliga.com/en-GB/player/${squad.person.slug}`} />
        </ActionPanel>
      }
    />
  );
}
