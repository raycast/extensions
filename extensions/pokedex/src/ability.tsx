import { List } from "@raycast/api";
import json2md from "json2md";
import groupBy from "lodash.groupby";
import abilities from "./statics/abilities.json";

const generations = groupBy(abilities, "generation");

export default function PokeAbilities() {
  return (
    <List throttle isShowingDetail={true}>
      {Object.entries(generations).map(([generation, abilities]) => {
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
