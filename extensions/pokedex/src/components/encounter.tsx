import { Icon, List } from "@raycast/api";
import groupBy from "lodash.groupby";
import uniqBy from "lodash.uniqby";
import { PokemonEncounter } from "../types";
import { getLocalizedName } from "../utils";

export default function PokemonEncounters(props: {
  name: string;
  encounters: PokemonEncounter[];
}) {
  const generations = groupBy(
    props.encounters.filter((e) => e.version?.versiongroup?.generation),
    (e) =>
      getLocalizedName(
        e.version.versiongroup.generation.generationnames,
        e.version.versiongroup.generation.name,
      ),
  );

  return (
    <List throttle navigationTitle={`${props.name} | Where to find`}>
      {Object.entries(generations).map(([generation, groups]) => {
        const locations = uniqBy(
          groups.filter((l) => l.locationarea),
          (l) => l.locationarea.name,
        );
        const versions = groupBy(locations, (l) =>
          getLocalizedName(l.version.versionnames, l.version.name),
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
                        .map((e) =>
                          getLocalizedName(
                            e.locationarea.locationareanames,
                            e.locationarea.name,
                          ),
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
      <List.EmptyView icon={Icon.Map} title="No Encounters Found" />
    </List>
  );
}
