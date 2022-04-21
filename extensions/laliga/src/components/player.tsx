import { Action, ActionPanel, Detail } from "@raycast/api";
import { format } from "date-fns";
import json2md from "json2md";
import { Squad } from "../types";

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
            text={squad.person.country?.id}
          />
          <Detail.Metadata.Label
            title="Date of Birth"
            text={format(new Date(squad.person.date_of_birth), "dd/MM/yyyy")}
          />
          <Detail.Metadata.Label
            title="Place of Birth"
            text={squad.person.place_of_birth}
          />
          <Detail.Metadata.Label
            title="Height (cm)"
            text={squad.person.height?.toString()}
          />
          <Detail.Metadata.Label
            title="Weight (kg)"
            text={squad.person.weight?.toString()}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Position" text={squad.position.name} />
          <Detail.Metadata.Label
            title="Shirt Number"
            text={squad.shirt_number?.toString()}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={`https://www.laliga.com/en-GB/player/$${squad.person.slug}`}
          />
        </ActionPanel>
      }
    />
  );
}
