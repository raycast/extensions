import { List, getPreferenceValues } from "@raycast/api";
import json2md from "json2md";
import groupBy from "lodash.groupby";
import orderBy from "lodash.orderby";
import { useState } from "react";
import { FlavorText, PokemonDexNumber } from "../types";
import { nationalDexNumber } from "../utils";

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

  const [language, setLanguage] = useState<string>(
    getPreferenceValues().language,
  );

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
      searchBarAccessory={
        <List.Dropdown
          tooltip="Change Language"
          value={language}
          onChange={setLanguage}
        >
          <List.Dropdown.Item title="English" value="9" />
          <List.Dropdown.Item title="Spanish" value="7" />
          <List.Dropdown.Item title="French" value="5" />
          <List.Dropdown.Item title="German" value="6" />
          <List.Dropdown.Item title="Italian" value="8" />
          <List.Dropdown.Item title="Japanese" value="1" />
          <List.Dropdown.Item title="Korean" value="3" />
          <List.Dropdown.Item title="Chinese (Simplified)" value="12" />
          <List.Dropdown.Item title="Chinese (Traditional)" value="11" />
        </List.Dropdown>
      }
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
