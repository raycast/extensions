import { List } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import PlantListItem from "./PlantListItem";

export default function Command() {
  const [plants, setPlants] = useState<Plant[]>([]);

  useEffect(() => {
    async function fetchPlants() {
      const res = await axios.get<Plant[]>(
        "https://fourthclasshonours.github.io/toxic-plant-list-scraper/toxicPlants.json"
      );
      setPlants(res.data);
    }

    fetchPlants();
  }, []);

  return (
    <List isShowingDetail searchBarPlaceholder="Search for toxic plants..." isLoading={plants.length === 0}>
      {plants.map((plant, index) => (
        <PlantListItem plant={plant} key={index} />
      ))}
      <List.EmptyView
        icon="🪴"
        title="Can't find your plant?"
        description="Try searching it's scientific name instead"
      />
    </List>
  );
}
