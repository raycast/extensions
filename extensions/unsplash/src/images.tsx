import { useState } from "react";
import { Grid } from "@raycast/api";
import { getGridItemSize, showImageTitle, toTitleCase } from "@/functions/utils";

// Hooks
import { useSearch } from "@/hooks/useSearch";

// Components
import Actions from "@/components/Actions";

// Types
import { Orientation, SearchResult } from "@/types";
interface SearchListItemProps {
  searchResult: SearchResult;
}

const UnsplashImages: React.FC = () => {
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [search, setSearch] = useState("");
  const { state } = useSearch(search, "photos", orientation);
  const itemSize = getGridItemSize();

  const handleOrientationChange = (value: string) => {
    setOrientation(value as Orientation);
  };

  return (
    <Grid
      isLoading={state.isLoading}
      itemSize={itemSize}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search wallpapers..."
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Orientation"
          storeValue={true}
          defaultValue={orientation}
          onChange={handleOrientationChange}
        >
          <Grid.Dropdown.Section title="Orientation">
            <Grid.Dropdown.Item title="All" value="all" />
            <Grid.Dropdown.Item title="Landscape" value="landscape" />
            <Grid.Dropdown.Item title="Portrait" value="portrait" />
            <Grid.Dropdown.Item title="Squarish" value="squarish" />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
      throttle
      pagination={state.pagination}
    >
      <Grid.Section title="Results" subtitle={String(state?.results?.length)}>
        {state.results.map((result) => (
          <SearchListItem key={result.id} searchResult={result} />
        ))}
      </Grid.Section>
    </Grid>
  );
};

const SearchListItem: React.FC<SearchListItemProps> = ({ searchResult }) => {
  const [title, image] = [
    searchResult.description || searchResult.alt_description || searchResult.user.name || "No Name",
    searchResult.urls?.thumb || searchResult.urls?.small || searchResult.urls?.regular,
  ];

  const gridItemTitle = showImageTitle() ? toTitleCase(title) : "";

  return <Grid.Item content={image} title={gridItemTitle} actions={<Actions item={searchResult} details />} />;
};

export default UnsplashImages;
