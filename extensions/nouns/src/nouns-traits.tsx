import { useState, useEffect } from "react";
import { Grid } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { TraitCategories, traitCategories, traits } from "./traits";

export default function Command() {
  const { data, isLoading } = useFetch<any>("https://7tedfll1w4.execute-api.us-east-2.amazonaws.com/Prod/rarity-stats");

  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<TraitCategories>("all");
  const [nounData, setNounData] = useState<any>(data?.noun_stats || []);

  useEffect(() => {
    if (data && searchTerm && category) {
      const searchTermByIndex = traits[category].findIndex((trait: any) => {
        return trait.label.toLowerCase() === searchTerm.toLowerCase();
      });

      const result = data.noun_stats.filter((noun: any) => {
        if (category === "noun_id") {
          return noun[category] === Number(searchTerm);
        }
        return noun[category] === searchTermByIndex;
      });

      setNounData(result);
    } else {
      setNounData(data.noun_stats);
    }
  }, [category, searchTerm]);

  return (
    <Grid
      isLoading={isLoading}
      onSearchTextChange={setSearchTerm}
      searchText={searchTerm}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Search By"
          defaultValue={category}
          onChange={(newValue) => {
            setCategory(newValue as TraitCategories);
            setSearchTerm("");
          }}
        >
          {Object.entries(traitCategories).map((entry) => (
            <Grid.Dropdown.Item key={entry[0]} title={entry[1]} value={entry[0]} />
          ))}
        </Grid.Dropdown>
      }
    >
      {nounData.map((noun: any) => (
        <Grid.Item key={noun.noun_id} title={`Noun #${noun.noun_id}`} content={`https://noun.pics/${noun.noun_id}`} />
      ))}
    </Grid>
  );
}
