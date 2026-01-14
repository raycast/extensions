import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { fetchTypesWithCaching } from "./api";
import { typeColor } from "./utils";
import { TypeDetail } from "./components/TypeDetail";

export default function TypeChart(props: { arguments: { search?: string } }) {
  const { search } = props.arguments;
  const { data: types, isLoading } = usePromise(fetchTypesWithCaching);

  const filteredTypes = useMemo(() => {
    if (!search || !types) return types;
    return types.filter((t) => {
      const typeName = t.typenames[0]?.name || t.name;
      return typeName.toLowerCase().includes(search.toLowerCase());
    });
  }, [search, types]);

  return (
    <List
      isLoading={isLoading}
      throttle
      searchBarPlaceholder="Search Pokémon type..."
    >
      {filteredTypes?.map((type) => {
        const typeName = type.typenames[0]?.name || type.name;

        // Calculate short summary for the list item
        const strongVs: string[] = [];
        const weakTo: string[] = [];

        // Offense: What this type is super effective against
        type.typeefficacies.forEach((eff) => {
          if (eff.damage_factor === 200) {
            strongVs.push(
              eff.target_type.typenames[0]?.name || eff.target_type.name,
            );
          }
        });

        // Defense: What hits this type super effectively
        (types || []).forEach((attacker) => {
          const eff = attacker.typeefficacies.find(
            (e) => e.target_type_id === type.id,
          );
          if (eff?.damage_factor === 200) {
            weakTo.push(attacker.typenames[0]?.name || attacker.name);
          }
        });

        return (
          <List.Item
            key={type.id}
            title={typeName}
            icon={{
              source: `types/${type.name}.svg`,
              tintColor: typeColor[type.name] || Color.PrimaryText,
            }}
            subtitle={`Strong vs: ${[...new Set(strongVs)].join(", ") || "None"}`}
            accessories={[
              {
                tag: {
                  value: `Weak vs: ${[...new Set(weakTo)].join(", ") || "None"}`,
                  color: Color.SecondaryText,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Full Type Details"
                  icon={Icon.Eye}
                  target={<TypeDetail type={type} allTypes={types || []} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
