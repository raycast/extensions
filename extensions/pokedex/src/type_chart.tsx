import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { fetchTypes } from "./api";
import { getLocalizedName } from "./utils";
import WeaknessMetadata from "./components/metadata/weakness";
import StrengthMetadata from "./components/metadata/strength";

export default function TypeChart(props: { arguments: { search?: string } }) {
  const { search } = props.arguments;
  const { data: types = [], isLoading } = usePromise(fetchTypes);

  const filteredTypes = useMemo(() => {
    if (!search || !types) return types;
    return types.filter((t) => {
      const typeName = getLocalizedName(t.typenames, t.name);
      return typeName.toLowerCase().includes(search.toLowerCase());
    });
  }, [search, types]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={true}
      searchBarPlaceholder="Search Pokémon type..."
    >
      {filteredTypes.map((type) => {
        const typeName = getLocalizedName(type.typenames, type.name);

        return (
          <List.Item
            key={type.id}
            title={typeName}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Type"
                      text="Attacking"
                    />
                    <StrengthMetadata type="detail" types={[{ type }]} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Type"
                      text="Defending"
                    />
                    <WeaknessMetadata type="detail" types={[{ type }]} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            icon={{
              source: `types/${type.name}.svg`,
            }}
          />
        );
      })}
    </List>
  );
}
