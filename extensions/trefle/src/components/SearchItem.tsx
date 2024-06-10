import { Action, ActionPanel, Grid, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import type { SpeciesLight } from "@/api/trefle";
import PlantDetail from "@/components/PlantDetail";

const SearchItem = ({ plant, type }: { plant: SpeciesLight; type: "grid" | "list" }) => {
  const commonProps = {
    id: plant.id.toString(),
    title: plant.scientific_name,
    subtitle: plant.common_name ?? "",
    actions: (
      <ActionPanel>
        <Action.Push title="Show Detail" target={<PlantDetail id={plant.id} />} />
      </ActionPanel>
    ),
  };
  if (type === "grid") {
    return (
      <Grid.Item
        {...commonProps}
        content={
          plant.image_url ? { source: plant.image_url } : getAvatarIcon(plant.common_name ?? plant.scientific_name)
        }
      />
    );
  }
  return <List.Item {...commonProps} icon={getAvatarIcon(plant.common_name ?? plant.scientific_name)} />;
};

export default SearchItem;
