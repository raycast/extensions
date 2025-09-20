import { useState } from "react";
import { Grid } from "@raycast/api";
import { getGridItemSize, showImageTitle, toTitleCase } from "@/functions/utils";

// Hooks
import { useSearch } from "@/hooks/useSearch";

// Components
import Actions from "@/components/ActionsCollection";

// Types
import { CollectionResult, Orientation } from "@/types";
interface CollectionListItemProps {
  searchResult: CollectionResult;
}

const UnsplashCollections: React.FC = () => {
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [search, setSearch] = useState("");
  const { state } = useSearch(search, "collections", orientation);
  const itemSize = getGridItemSize();

  const handleOrientationChange = (value: string) => {
    setOrientation(value as Orientation);
  };

  return (
    <Grid
      isLoading={state.isLoading}
      itemSize={itemSize}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search collections..."
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
          <SearchListItem key={result.id} searchResult={result as unknown as CollectionResult} />
        ))}
      </Grid.Section>
    </Grid>
  );
};

const SearchListItem: React.FC<CollectionListItemProps> = ({ searchResult }) => {
  const [title, image] = [
    searchResult.title || searchResult.description,
    searchResult.cover_photo?.urls?.thumb ||
      searchResult.cover_photo?.urls?.small ||
      searchResult.cover_photo?.urls?.regular,
  ];

  const gridItemTitle = showImageTitle() ? toTitleCase(title) : "";

  return <Grid.Item content={image} title={gridItemTitle} actions={<Actions item={searchResult} details />} />;
};

export default UnsplashCollections;
