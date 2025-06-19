import { Grid } from "@raycast/api";
import { useState } from "react";

// Import custom hooks
import { useGoogleImageSearch } from "./hooks/useGoogleImageSearch";

// Import components
import { ImageActionPanel } from "./components/ImageActionPanel";
import ImageTypeAccessory from "./components/ImageTypeAccessory";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";
import { showFailureToast } from "@raycast/utils";

export default function GoogleImageSearch() {
  const [searchText, setSearchText] = useState("");
  const [viewType, setViewType] = useState("all");

  const { columns } = getPreferenceValues<Preferences>();

  const {
    isLoading,
    data: imageResults,
    pagination,
    error,
  } = useGoogleImageSearch({
    term: searchText,
    limit: 10,
    viewType,
  });

  return (
    <Grid
      columns={columns}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      isLoading={isLoading}
      pagination={pagination}
      throttle={true}
      searchBarAccessory={<ImageTypeAccessory setViewType={setViewType} />}
    >
      {error ? (
        <Grid.EmptyView title="Error" description={error} />
      ) : (
        <>
          {imageResults.length === 0 ? (
            <Grid.EmptyView title="No Results" description="Search for images or try a different query!" />
          ) : (
            <Grid.Section title="Search Results">
              {imageResults.map((result, index) => {
                const thumbnailSource = result.image?.thumbnailLink || "";

                try {
                  return (
                    <Grid.Item
                      key={index}
                      content={{ source: thumbnailSource }}
                      title={result.title}
                      actions={<ImageActionPanel result={result} searchText={searchText} />}
                    />
                  );
                } catch (error) {
                  showFailureToast(error, { title: "Error processing image results" });
                  return null;
                }
              })}
            </Grid.Section>
          )}
        </>
      )}
    </Grid>
  );
}
