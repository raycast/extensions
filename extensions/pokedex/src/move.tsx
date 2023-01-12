import { useMemo, useState } from "react";
import { List } from "@raycast/api";
import groupBy from "lodash.groupby";

import moves from "./statics/moves.json";

export default function Move() {
  const [searchText, setSearchText] = useState<string>("");

  const generations = useMemo(() => {
    const listing = searchText
      ? moves.filter(
          (move) =>
            move.name.toLowerCase().includes(searchText.toLowerCase()) ||
            move.short_effect.toLowerCase().includes(searchText.toLowerCase())
        )
      : moves;

    return groupBy(listing, "generation");
  }, [searchText]);

  return (
    <List throttle onSearchTextChange={setSearchText}>
      {Object.entries(generations).map(([generation, moves]) => {
        return (
          <List.Section key={generation} title={generation}>
            {moves.map((move, idx) => {
              return (
                <List.Item
                  key={idx}
                  title={move.name}
                  subtitle={move.short_effect}
                  icon={`moves/${move.damage_class || "status"}.png`}
                  accessoryTitle={move.type}
                  accessoryIcon={`types/${move.type}.png`}
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
