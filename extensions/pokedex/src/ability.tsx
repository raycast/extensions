import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import json2md from "json2md";
import groupBy from "lodash.groupby";
import { useMemo } from "react";
import { fetchAbilities } from "./api";

export default function PokeAbilities(props: {
  arguments: { search?: string };
}) {
  const { search } = props.arguments;

  const { data: abilities, isLoading } = usePromise(fetchAbilities);
  const generations = useMemo(() => {
    return groupBy(abilities, "generation.generationnames.0.name");
  }, [abilities]);

  const filteredGenerations = useMemo(() => {
    if (!search) return generations;

    const filtered: Record<string, typeof abilities> = {};
    Object.entries(generations).forEach(([gen, list]) => {
      const filteredList = list.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase()),
      );
      if (filteredList.length > 0) {
        filtered[gen] = filteredList;
      }
    });
    return filtered;
  }, [abilities, search]);

  return (
    <List
      throttle
      isShowingDetail={true}
      isLoading={isLoading}
      searchBarPlaceholder="Search Abilities..."
    >
      {Object.entries(filteredGenerations).map(([generation, abilities]) => {
        return (
          <List.Section key={generation} title={generation}>
            {abilities?.map((ability) => {
              const abilityName = ability.abilitynames[0]?.name || ability.name;
              return (
                <List.Item
                  key={ability.name}
                  title={abilityName}
                  keywords={[ability.name, abilityName]}
                  detail={
                    <List.Item.Detail
                      markdown={json2md([
                        {
                          h1: abilityName,
                        },
                        {
                          p:
                            ability.generation.generationnames[0]?.name ||
                            "Unknown Generation",
                        },
                        {
                          p:
                            ability.abilityeffecttexts[0]?.effect ||
                            "No description available.",
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
