import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import PlantListItem from "./PlantListItem";

export default function Command() {
  const { isLoading, data, revalidate } = useFetch<Plant[]>(
    "https://foldaway.github.io/toxic-plant-list-scraper/toxicPlants.json"
  );

  return (
    <List isShowingDetail searchBarPlaceholder="Search for toxic plants..." isLoading={isLoading}>
      <List.EmptyView
        icon="🪴"
        title="Can't find your plant?"
        description="Try searching it's scientific name instead"
      />
      {data && data.map((plant, index) => <PlantListItem plant={plant} key={index} />)}
    </List>
  );
}
