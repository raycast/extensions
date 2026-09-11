import { useState } from "react";
import { Grid } from "@raycast/api";
import { getGridColumns, showImageTitle, toTitleCase } from "@/functions/utils";
import { useSearch } from "@/hooks/useSearch";
import { useSetupAuth } from "@/hooks/useSetupAuth";
import Actions from "@/components/Actions";
import OrientationDropdown from "@/components/OrientationDropdown";
import OAuthSetupGuide from "@/components/OAuthSetupGuide";
import { Orientation, SearchResult } from "@/types";

export default function UnsplashImages() {
  const auth = useSetupAuth();

  if (auth.status === "loading") return <Grid isLoading />;
  if (auth.status === "needs-setup")
    return <OAuthSetupGuide onConnect={auth.connect} connectError={auth.connectError} />;

  return <ImageGrid />;
}

function ImageGrid() {
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [search, setSearch] = useState("");
  const { state } = useSearch(search, "photos", orientation);

  return (
    <Grid
      isLoading={state.isLoading}
      columns={getGridColumns()}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search wallpapers..."
      searchBarAccessory={<OrientationDropdown onChange={setOrientation} />}
      throttle
      pagination={state.pagination}
    >
      <Grid.Section title="Results" subtitle={String(state.results.length)}>
        {state.results.map((result) => (
          <ImageGridItem key={result.id} result={result} />
        ))}
      </Grid.Section>
    </Grid>
  );
}

function ImageGridItem({ result }: { result: SearchResult }) {
  const title = result.description || result.alt_description || result.user.name || "No Name";
  const image = result.urls.thumb || result.urls.small || result.urls.regular;
  return (
    <Grid.Item
      content={image}
      title={showImageTitle() ? toTitleCase(title) : ""}
      actions={<Actions item={result} details />}
    />
  );
}
