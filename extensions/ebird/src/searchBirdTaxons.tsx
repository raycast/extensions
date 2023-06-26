import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import Fuse from "fuse.js";
import { useState } from "react";
import { EbirdClient } from "./api/ebird-client";
import TaxonListItem from "./components/TaxonListItem";
import { EBIRD_API_TOKEN, SEARCH_LIMIT } from "./constants/config";

export default function SearchBirdTaxons() {
  const [searchText, setSearchText] = useState("");
  const ebirdClient = new EbirdClient(EBIRD_API_TOKEN);
  const { data, isLoading } = useCachedPromise(ebirdClient.listTaxons);
  const taxons = data?.taxons ?? [];

  const fuse = new Fuse(taxons, {
    includeScore: true,
    keys: [
      {
        name: "sciName",
        weight: 1,
      },
      {
        name: "comName",
        weight: 1,
      },
      {
        name: "speciesCode",
        weight: 2,
      },
      {
        name: "acronym",
        weight: 2,
      },
    ],
  });

  const searchResults = fuse.search(searchText.length ? searchText : "a", { limit: SEARCH_LIMIT });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for birds from eBird..."
      searchText={searchText}
      throttle
    >
      <List.Section title="Results" subtitle={searchResults.length + ""}>
        {searchResults.map((result) => (
          <TaxonListItem key={result.item.speciesCode} taxon={result.item} />
        ))}
      </List.Section>
    </List>
  );
}
