import { useMemo, useState } from "react";
import { List } from "@raycast/api";
import json2md from "json2md";
import groupBy from "lodash.groupby";
import TypeDropdown from "./components/type_dropdown";

import moves from "./statics/moves.json";

export default function Move() {
  const [type, setType] = useState<string>("all");

  const generations = useMemo(() => {
    const listing =
      type === "all" ? moves : moves.filter((m) => m.type === type);

    return groupBy(listing, "generation");
  }, [type]);

  return (
    <List
      throttle
      isShowingDetail={true}
      searchBarAccessory={
        <TypeDropdown command="Move" onSelectType={setType} />
      }
    >
      {Object.entries(generations).map(([generation, moves]) => {
        return (
          <List.Section key={generation} title={generation}>
            {moves.map((move, idx) => {
              return (
                <List.Item
                  key={idx}
                  title={move.name}
                  icon={`moves/${move.damage_class || "status"}.svg`}
                  accessories={[
                    { text: move.type },
                    { icon: `types/${move.type.toLowerCase()}.svg` },
                  ]}
                  keywords={[move.name, move.short_effect]}
                  detail={
                    <List.Item.Detail
                      markdown={json2md([
                        {
                          h1: move.name,
                        },
                        { p: move.short_effect },
                      ])}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label
                            title="Power"
                            text={move.power?.toString() || "-"}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Accuracy"
                            text={move.accuracy ? move.accuracy + "%" : "-"}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="PP"
                            text={move.pp?.toString() || "-"}
                          />
                        </List.Item.Detail.Metadata>
                      }
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
