import { Detail } from "@raycast/api";
import json2md from "json2md";
import { usePerson } from "../hooks";
import { Name } from "../types";
import { positionMap, getFlagEmoji } from "../utils";

export default function Person(props: Name) {
  const player = usePerson(props.slugifiedFull);

  return player ? (
    <Detail
      navigationTitle={`${props.full} | Profile & Stats`}
      isLoading={!player}
      markdown={json2md([
        { h1: player.names.full },
        {
          img: {
            source: player.playerImages.HALF_BODY,
          },
        },
        (player.playertext || []).map((text) => {
          return [
            {
              h2: text.heading || "",
            },
            {
              p: text.paragraphs,
            },
          ];
        }),
      ])}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Nationality"
            icon={getFlagEmoji(player.nationality.firstNationalityCode)}
            text={player.nationality.firstNationality}
          />
          <Detail.Metadata.Label
            title="Date of Birth"
            text={player.birth.date.toString()}
          />
          <Detail.Metadata.Label
            title="Height"
            text={`${
              player.bio.height.height
            }${player.bio.height.unit.toLowerCase()}`}
          />
          <Detail.Metadata.Label
            title="Weight"
            text={`${
              player.bio.weight.weight
            }${player.bio.weight.unit.toLowerCase()}`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Position"
            text={positionMap.get(player.position)}
          />
          <Detail.Metadata.Label
            title="Shirt Number"
            text={player.shirtNumber}
          />
        </Detail.Metadata>
      }
    />
  ) : (
    <Detail navigationTitle={`${props.full} | Profile & Stats`} />
  );
}
