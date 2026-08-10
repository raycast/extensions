import { Action, ActionPanel, List } from "@raycast/api";
import { ANIMAL_EMOJI_MAP } from "./constants";
import PlantListItemDetail from "./PlantListItemDetail";

type PlantListItemProps = {
  plant: Plant;
};

export default function PlantListItem({ plant }: PlantListItemProps) {
  return (
    <List.Item
      title={plant.name}
      subtitle={plant.scientificName}
      keywords={[...plant.commonNames, plant.scientificName]}
      accessories={[
        {
          text: plant.toxicTo.map((animal) => ANIMAL_EMOJI_MAP[animal]).join(" "),
        },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Show Full Details" url={plant.link} />
        </ActionPanel>
      }
      detail={<PlantListItemDetail plant={plant} />}
    />
  );
}
