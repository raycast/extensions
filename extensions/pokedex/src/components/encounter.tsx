import { List } from "@raycast/api";
import groupBy from "lodash.groupby";
import { PokemonV2Encounter } from "../types";

export default function PokemonEncounters(props: {
  name: string;
  encounters: PokemonV2Encounter[];
}) {
  return (
    <List throttle navigationTitle={`${props.name} | Where to find`}>
      {Object.entries(
        groupBy(
          props.encounters,
          (e) =>
            e.pokemon_v2_version.pokemon_v2_versiongroup.pokemon_v2_generation
              .pokemon_v2_generationnames[0].name,
        ),
      ).map(([generation, groups]) => {
        return (
          <List.Section title={generation} key={generation}>
            {groups.map((location, idx) => {
              return (
                <List.Item
                  key={idx}
                  title={
                    location.pokemon_v2_version.pokemon_v2_versionnames[0].name
                  }
                  accessories={[
                    {
                      text:
                        location.pokemon_v2_locationarea
                          .pokemon_v2_locationareanames[0]?.name || "",
                    },
                  ]}
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
