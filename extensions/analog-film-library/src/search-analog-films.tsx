import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

type KeyFeature = {
  _id: string;
  feature: string;
};

type Film = {
  _id: string;
  brand: string;
  name: string;
  iso: number;
  formatThirtyFive: boolean;
  formatOneTwenty: boolean;
  color: boolean;
  process: string;
  staticImageUrl: string;
  description: string;
  customDescription: string[];
  keyFeatures: KeyFeature[];
  dateAdded: string;
  __v: number;
};

function BrandDropdown(props: { brands: string[]; onBrandChange: (newValue: string) => void }) {
  const { brands, onBrandChange } = props;

  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <List.Dropdown
      tooltip="Filter by Brand"
      storeValue={true}
      onChange={(newValue) => {
        onBrandChange(newValue);
      }}
    >
      <List.Dropdown.Item key="all" title="All Brands" value="all" />
      <List.Dropdown.Section title="Brands">
        {brands.map((brand) => (
          <List.Dropdown.Item key={brand} title={capitalizeFirstLetter(brand)} value={brand} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("all");

  const { isLoading, data } = useCachedPromise(
    async (url: string) => {
      const response = await fetch(url);
      const result = await response.json();
      return result as Film[];
    },
    ["https://filmapi.vercel.app/api/films"],
  );

  // Get unique brands from the data
  const brands = Array.from(new Set(data?.map((film) => film.brand) || [])).sort();

  const filteredData = data
    ?.filter((film: Film) => {
      const matchesBrand = selectedBrand === "all" || film.brand === selectedBrand;

      if (!searchText) return matchesBrand;

      const searchTerms = searchText.toLowerCase().split(" ");
      const searchableText = [
        film.name,
        film.brand,
        film.iso.toString(),
        film.process,
        film.color ? "color" : "b&w",
        ...film.keyFeatures.map((f) => f.feature),
      ]
        .join(" ")
        .toLowerCase()
        // Normalize common variations for better matching
        .replace(/-/g, "") // Remove hyphens so "c-41" becomes "c41"
        .replace(/\s+/g, " "); // Normalize whitespace

      // Check if all search terms are found in the searchable text
      const matchesSearch = searchTerms.every(
        (term) => searchableText.includes(term.replace(/-/g, "")), // Also remove hyphens from search terms
      );

      return matchesSearch && matchesBrand;
    })
    ?.sort((a, b) => {
      // Sort alphabetically when no search text
      if (!searchText) {
        return a.name.localeCompare(b.name);
      }
      // Keep original order when searching (relevance-based)
      return 0;
    });

  const onBrandChange = (newValue: string) => {
    setSelectedBrand(newValue);
  };

  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const capitalizeWords = (str: string) => {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      isShowingDetail
      searchBarPlaceholder="Search by name, brand, ISO, process…"
      searchBarAccessory={<BrandDropdown brands={brands} onBrandChange={onBrandChange} />}
    >
      {(filteredData || []).map((film: Film) => {
        const markdown = `
<img src="${film.staticImageUrl}" alt="${film.name}" width="100" height="100" />

${film.description}
        `;
        return (
          <List.Item
            key={film._id}
            title={capitalizeWords(film.name)}
            subtitle={capitalizeFirstLetter(film.brand)}
            keywords={[film.brand, film.name, film.iso.toString(), film.process, film.color ? "Color" : "B&W"]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Search on Flickr"
                  url={`https://www.flickr.com/photos/tags/${encodeURIComponent(film.brand + " " + film.name + " film")}/`}
                  icon={Icon.MagnifyingGlass}
                />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={markdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Brand" text={capitalizeFirstLetter(film.brand)} />
                    <List.Item.Detail.Metadata.Label title="ISO Speed" text={film.iso.toString()} />
                    <List.Item.Detail.Metadata.Label title="Process" text={film.process.toUpperCase()} />
                    <List.Item.Detail.Metadata.Label title="Color Film" text={film.color ? "Yes" : "No"} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Formats"
                      text={{ value: "35mm", color: film.formatThirtyFive ? Color.PrimaryText : Color.SecondaryText }}
                      icon={{
                        source: film.formatThirtyFive ? Icon.Checkmark : Icon.Xmark,
                        tintColor: film.formatThirtyFive ? Color.PrimaryText : Color.SecondaryText,
                      }}
                    />
                    <List.Item.Detail.Metadata.Label
                      title=""
                      text={{
                        value: "120 Medium Format",
                        color: film.formatOneTwenty ? Color.PrimaryText : Color.SecondaryText,
                      }}
                      icon={{
                        source: film.formatOneTwenty ? Icon.Checkmark : Icon.Xmark,
                        tintColor: film.formatOneTwenty ? Color.PrimaryText : Color.SecondaryText,
                      }}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    {film.keyFeatures.length > 0 && (
                      <>
                        <List.Item.Detail.Metadata.Label
                          title="Key Features"
                          text={capitalizeWords(film.keyFeatures[0].feature)}
                        />
                        {film.keyFeatures.slice(1).map((feature) => (
                          <List.Item.Detail.Metadata.Label
                            key={feature._id}
                            text={capitalizeWords(feature.feature)}
                            title=""
                          />
                        ))}
                      </>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
    </List>
  );
}
