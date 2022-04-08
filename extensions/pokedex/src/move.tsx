import { useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
} from "@raycast/api";
import json2md from "json2md";
import groupBy from "lodash.groupby";
import TypeDropdown from "./components/type_dropdown";

import moves from "./statics/moves.json";

const preference = getPreferenceValues();

export default function Move() {
  const [searchText, setSearchText] = useState<string>("");
  const [type, setType] = useState<string>("all");
  const [showPreview, setShowPreview] = useState<boolean>(
    preference.showPreview
  );

  const generations = useMemo(() => {
    let listing = searchText
      ? moves.filter(
          (move) =>
            move.name.toLowerCase().includes(searchText.toLowerCase()) ||
            move.short_effect.toLowerCase().includes(searchText.toLowerCase())
        )
      : moves;

    if (type != "all") {
      listing = listing.filter((p) => p.type === type);
    }

    return groupBy(listing, "generation");
  }, [searchText, type]);

  return (
    <List
      throttle
      onSearchTextChange={setSearchText}
      isShowingDetail={showPreview}
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
                  subtitle={showPreview ? undefined : move.short_effect}
                  icon={`moves/${move.damage_class || "status"}.svg`}
                  accessories={[
                    {
                      text: move.type,
                      icon: `types/${move.type.toLowerCase()}.svg`,
                    },
                  ]}
                  detail={
                    showPreview ? (
                      <List.Item.Detail
                        markdown={json2md([
                          {
                            h1: move.name,
                          },
                          { p: move.short_effect },
                          { p: `**Power**: ${move.power || "-"}` },
                          {
                            p: `**Accuracy**: ${
                              move.accuracy ? move.accuracy + "%" : "-"
                            }`,
                          },
                          { p: `**PP**: ${move.pp || "-"}` },
                        ])}
                      />
                    ) : undefined
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        title={showPreview ? "Hide Preview" : "Show Preview"}
                        icon={Icon.Sidebar}
                        onAction={() => setShowPreview(!showPreview)}
                      />
                    </ActionPanel>
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
