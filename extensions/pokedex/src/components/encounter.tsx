import { List } from "@raycast/api";
import groupBy from "lodash.groupby";
import uniqBy from "lodash.uniqby";
import { PokemonEncounter } from "../types";

export default function PokemonEncounters(props: {
  name: string;
  encounters: PokemonEncounter[];
}) {
  const generations = groupBy(
    props.encounters.filter(
      (e) => e.version?.versiongroup?.generation?.generationnames?.[0]?.name,
    ),
    (e) => e.version.versiongroup.generation.generationnames[0].name,
  );

  return (
    <List throttle navigationTitle={`${props.name} | Where to find`}>
      {Object.entries(generations).map(([generation, groups]) => {
        const locations = uniqBy(
          groups.filter((l) => l.locationarea),
          (l) => l.locationarea.name,
        );
        const versions = groupBy(
          locations,
          (l) => l.version.versionnames[0]?.name || l.version.name,
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
                            e.locationarea.locationareanames[0]?.name ||
                            e.locationarea.name,
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
