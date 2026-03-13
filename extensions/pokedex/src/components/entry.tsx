import { List } from "@raycast/api";
import json2md from "json2md";
import groupBy from "lodash.groupby";
import orderBy from "lodash.orderby";
import { FlavorText, PokemonDexNumber } from "../types";
import { fixFlavorText, nationalDexNumber } from "../utils";

export default function PokedexEntries(props: {
  name: string;
  dex_numbers: PokemonDexNumber[];
  entries: FlavorText[];
}) {
  const dexNumber: Record<string, number> = {};
  props.dex_numbers.forEach((dex) => {
    dex.pokedex.pokedexversiongroups.forEach((vg) => {
      vg.versiongroup.versions.forEach((v) => {
        dexNumber[v.name] = dex.pokedex_number;
      });
    });
  });

  const generations = orderBy(
    Object.entries(
      groupBy(props.entries, (e) => e.version.versiongroup.generation_id),
    ).map(([id, entries]) => {
      const groups = groupBy(entries, (e) => e.version.versiongroup.name);
      return {
        id: Number(id),
        name: entries[0].version.versiongroup.generation.generationnames[0]
          .name,
        groups: Object.values(groups).map((group) => ({
          version_group: group[0].version.versiongroup,
          entries: group,
        })),
      };
    }),
    "id",
    "desc",
  );

  return (
    <List
      throttle
      navigationTitle={`${props.name} | Pokédex Entries`}
      isShowingDetail
    >
      {generations.map((generation) => {
        return (
          <List.Section title={generation.name} key={generation.name}>
            {generation.groups.map((group) => {
              const entry = group.entries.find(
                (e) => e.version.versiongroup.name === group.version_group.name,
              );

              if (!entry) return null;

              const title =
                group.version_group.versions
                  ?.map((v) => v.versionnames[0]?.name || v.name)
                  .join(" & ") ||
                entry.version.versionnames[0]?.name ||
                entry.version.name;

              return (
                <List.Item
                  key={group.version_group.id}
                  title={title}
                  accessories={[
                    {
                      text:
                        group.version_group.versions?.[0]?.name &&
                        dexNumber[group.version_group.versions[0].name]
                          ? nationalDexNumber(
                              dexNumber[group.version_group.versions[0].name],
                            )
                          : entry.version.name && dexNumber[entry.version.name]
                            ? nationalDexNumber(dexNumber[entry.version.name])
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
                          p: fixFlavorText(entry.flavor_text),
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
