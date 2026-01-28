import { List } from "@raycast/api";
import json2md from "json2md";
import groupBy from "lodash.groupby";
import { PokemonV2Flavortext } from "../types";

export default function Descriptions(props: {
  name: string;
  entries: PokemonV2Flavortext[];
}) {
  return (
    <List
      throttle
      navigationTitle={`${props.name} | Descriptions`}
      isShowingDetail={Boolean(props.entries.length)}
    >
      {Object.entries(
        groupBy(
          props.entries,
          (e) =>
            e.pokemon_v2_versiongroup.pokemon_v2_generation
              .pokemon_v2_generationnames[0].name,
        ),
      ).map(([generation, groups]) => {
        return (
          <List.Section title={generation} key={generation}>
            {groups.map((entry, idx) => {
              const title = entry.pokemon_v2_versiongroup.pokemon_v2_versions
                .map((v) => v.pokemon_v2_versionnames[0].name)
                .join(" & ");
              return (
                <List.Item
                  key={idx}
                  title={title}
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
