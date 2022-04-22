import { useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
} from "@raycast/api";
import groupBy from "lodash.groupby";
import json2md from "json2md";

const preference = getPreferenceValues();

import abilities from "./statics/abilities.json";

export default function Ability() {
  const [searchText, setSearchText] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(
    preference.showPreview
  );

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
    <List
      throttle
      onSearchTextChange={setSearchText}
      isShowingDetail={showPreview}
    >
      {Object.entries(generations).map(([generation, abilities]) => {
        return (
          <List.Section key={generation} title={generation}>
            {abilities.map((ability) => {
              const props: Partial<List.Item.Props> = showPreview
                ? {
                    detail: (
                      <List.Item.Detail
                        markdown={json2md([
                          {
                            h1: ability.name,
                          },
                          {
                            p: ability.generation,
                          },
                          {
                            p: ability.effect,
                          },
                        ])}
                      />
                    ),
                  }
                : {
                    subtitle: ability.short_effect,
                  };
              return (
                <List.Item
                  key={ability.name}
                  title={ability.name}
                  {...props}
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
