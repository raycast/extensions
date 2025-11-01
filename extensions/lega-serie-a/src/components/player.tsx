import { Action, ActionPanel, Detail, getPreferenceValues } from "@raycast/api";
import { formatDate } from "date-fns";
import json2md from "json2md";
import { Squad } from "../types";
import { getFlagEmoji, positionMap } from "../utils";

const { language } = getPreferenceValues();

export default function Player(player: Squad) {
  return (
    <Detail
      navigationTitle={`${player.name} | Profile & Stats`}
      markdown={json2md([
        { h1: player.name },
        {
          img: {
            source: player.medium_shot,
          },
        },
      ])}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Nationality"
            icon={getFlagEmoji(player.nationality)}
            text={player.nationality}
          />
          <Detail.Metadata.Label
            title="Date of Birth"
            text={formatDate(player.birth_day, "dd MMM yyyy")}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Position"
            text={
              language === "en" ? positionMap.get(player.cod_role) : player.role
            }
          />
          <Detail.Metadata.Label
            title="Shirt Number"
            text={player.uniform_number.toString()}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={`https://www.legaseriea.it/${language}/player/${player.slug}`}
          />
        </ActionPanel>
      }
    />
  );
}
