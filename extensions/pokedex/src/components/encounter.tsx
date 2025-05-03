import { List } from "@raycast/api";
import groupBy from "lodash.groupby";
import uniqBy from "lodash.uniqby";
import { PokemonV2Encounter } from "../types";

export default function PokemonEncounters(props: {
  name: string;
  encounters: PokemonV2Encounter[];
}) {
  const generations = groupBy(
    props.encounters,
    (e) =>
      e.pokemon_v2_version.pokemon_v2_versiongroup.pokemon_v2_generation
        .pokemon_v2_generationnames[0].name,
  );

  return (
    <List throttle navigationTitle={`${props.name} | Where to find`}>
      {Object.entries(generations).map(([generation, groups]) => {
        const locations = uniqBy(groups, (l) => l.pokemon_v2_locationarea.name);
        const versions = groupBy(
          locations,
          (l) => l.pokemon_v2_version.pokemon_v2_versionnames[0].name,
        );

        return (
          <List.Section title={generation} key={generation}>
            {Object.entries(versions).map(([version, encounters]) => {
              return (
                <List.Item
                  key={version}
                  title={version}
                  accessories={[
                    {
                      text: encounters
                        .map(
                          (e) =>
                            e.pokemon_v2_locationarea
                              .pokemon_v2_locationareanames[0]?.name || "",
                        )
                        .filter((x) => !!x)
                        .join(", "),
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
