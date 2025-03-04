import { List } from "@raycast/api";
import json2md from "json2md";
import groupBy from "lodash.groupby";
import { PokemonV2Flavortext, PokemonV2Pokemondexnumber } from "../types";
import { nationalDexNumber } from "../utils";

export default function PokedexEntries(props: {
  name: string;
  dex_numbers: PokemonV2Pokemondexnumber[];
  entries: PokemonV2Flavortext[];
}) {
  const dexNumber: Record<string, number> = {};
  props.dex_numbers.forEach((dex) => {
    dex.pokemon_v2_pokedex.pokemon_v2_pokedexversiongroups.forEach((vg) => {
      vg.pokemon_v2_versiongroup.pokemon_v2_versions.forEach((v) => {
        dexNumber[v.name] = dex.pokedex_number;
      });
    });
  });

  return (
    <List
      throttle
      navigationTitle={`${props.name} | Pokédex Entries`}
      isShowingDetail={Boolean(props.entries.length)}
    >
      {Object.entries(
        groupBy(
          props.entries,
          (e) =>
            e.pokemon_v2_version.pokemon_v2_versiongroup.pokemon_v2_generation
              .pokemon_v2_generationnames[0].name,
        ),
      ).map(([generation, groups]) => {
        return (
          <List.Section title={generation} key={generation}>
            {groups.map((entry, idx) => {
              const title =
                entry.pokemon_v2_version.pokemon_v2_versionnames[0]?.name ||
                entry.pokemon_v2_version.name;
              return (
                <List.Item
                  key={idx}
                  title={title}
                  accessories={[
                    {
                      text: dexNumber[entry.pokemon_v2_version.name]
                        ? nationalDexNumber(
                            dexNumber[entry.pokemon_v2_version.name],
                          )
                        : "--",
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={json2md([
                        {
                          h1: title,
                        },
                        {
                          p: entry.flavor_text
                            .split("\n")
                            .join(" ")
                            .split("")
                            .join(" "),
                        },
                      ])}
                    />
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
