import { List } from "@raycast/api";
import json2md from "json2md";
import groupBy from "lodash.groupby";
import { useMemo } from "react";
import abilities from "./statics/abilities.json";

const generations = groupBy(abilities, "generation");

export default function PokeAbilities(props: {
  arguments: { search?: string };
}) {
  const { search } = props.arguments;

  const filteredGenerations = useMemo(() => {
    if (!search) return generations;

    const filtered: Record<string, typeof abilities> = {};
    Object.entries(generations).forEach(([gen, list]) => {
      const filteredList = list.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.short_effect.toLowerCase().includes(search.toLowerCase()),
      );
      if (filteredList.length > 0) {
        filtered[gen] = filteredList;
      }
    });
    return filtered;
  }, [search]);

  return (
    <List throttle isShowingDetail={true}>
      {Object.entries(filteredGenerations).map(([generation, abilities]) => {
        return (
          <List.Section key={generation} title={generation}>
            {abilities.map((ability) => {
              return (
                <List.Item
                  key={ability.name}
                  title={ability.name}
                  keywords={[ability.name, ability.short_effect]}
                  detail={
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
