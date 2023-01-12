import { useMemo, useState } from "react";
import { List } from "@raycast/api";
import groupBy from "lodash.groupby";

import abilities from "./statics/abilities.json";

export default function Ability() {
  const [searchText, setSearchText] = useState<string>("");

  const generations = useMemo(() => {
    const listing = searchText
      ? abilities.filter(
          (a) =>
            a.name.toLowerCase().includes(searchText.toLowerCase()) ||
            a.short_effect.toLowerCase().includes(searchText.toLowerCase())
        )
      : abilities;

    return groupBy(listing, "generation");
  }, [searchText]);

  return (
    <List throttle onSearchTextChange={setSearchText}>
      {Object.entries(generations).map(([generation, abilities]) => {
        return (
          <List.Section key={generation} title={generation}>
            {abilities.map((ability) => {
              return (
                <List.Item
                  key={ability.name}
                  title={ability.name}
                  subtitle={ability.short_effect}
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
