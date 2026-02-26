import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { fetchTypes } from "./api";
import { TypeDetail } from "./components/type_detail";

export default function TypeChart(props: { arguments: { search?: string } }) {
  const { search } = props.arguments;
  const { data: types, isLoading } = usePromise(fetchTypes);

  const filteredTypes = useMemo(() => {
    if (!search || !types) return types;
    return types.filter((t) => {
      const typeName = t.typenames[0]?.name || t.name;
      return typeName.toLowerCase().includes(search.toLowerCase());
    });
  }, [search, types]);

  return (
    <Grid
      isLoading={isLoading}
      columns={8}
      searchBarPlaceholder="Search Pokémon type..."
    >
      {filteredTypes?.map((type) => {
        const typeName = type.typenames[0]?.name || type.name;

        return (
          <Grid.Item
            key={type.id}
            title={typeName}
            content={{
              source: `types/${type.name}.svg`,
            }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Type Details"
                  icon={Icon.Eye}
                  target={<TypeDetail type={type} allTypes={types || []} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
