import { useState } from "react";
import { Grid } from "@raycast/api";
import { getGridColumns, showImageTitle, toTitleCase } from "@/functions/utils";
import { useSearch } from "@/hooks/useSearch";
import { useSetupAuth } from "@/hooks/useSetupAuth";
import Actions from "@/components/ActionsCollection";
import OrientationDropdown from "@/components/OrientationDropdown";
import OAuthSetupGuide from "@/components/OAuthSetupGuide";
import { CollectionResult, Orientation } from "@/types";

export default function UnsplashCollections() {
  const auth = useSetupAuth();

  if (auth.status === "loading") return <Grid isLoading />;
  if (auth.status === "needs-setup")
    return <OAuthSetupGuide onConnect={auth.connect} connectError={auth.connectError} />;

  return <CollectionGrid />;
}

function CollectionGrid() {
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [search, setSearch] = useState("");
  const { state } = useSearch(search, "collections", orientation);

  return (
    <Grid
      isLoading={state.isLoading}
      columns={getGridColumns()}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search collections..."
      searchBarAccessory={<OrientationDropdown onChange={setOrientation} />}
      throttle
      pagination={state.pagination}
    >
      <Grid.Section title="Results" subtitle={String(state.results.length)}>
        {state.results.map((result) => (
          <CollectionGridItem key={result.id} result={result} />
        ))}
      </Grid.Section>
    </Grid>
  );
}

function CollectionGridItem({ result }: { result: CollectionResult }) {
  const title = result.title || result.description || "No Name";
  const image = result.cover_photo?.urls?.thumb || result.cover_photo?.urls?.small || result.cover_photo?.urls?.regular;
  return (
    <Grid.Item
      content={image}
      title={showImageTitle() ? toTitleCase(title) : ""}
      actions={<Actions item={result} details />}
    />
  );
}
