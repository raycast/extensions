/**
 * @file apply-filter.tsx
 *
 * @summary Raycast command to apply filters on selected images.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:52:33
 * Last modified  : 2024-06-26 21:37:46
 */

import { Action, ActionPanel, Grid } from "@raycast/api";

import applyFilter from "./operations/filterOperation";
import { filters, getFilterThumbnail } from "./utilities/filters";
import { Filter } from "./utilities/types";
import { cleanup, getSelectedImages } from "./utilities/utils";
import { useState } from "react";
import runOperation from "./operations/runOperation";

export default function Command() {
  const [selectedFilter, setSelectedFilter] = useState<Filter>();
  const [preview, setPreview] = useState<string>("");

  const gridItems = filters.map((filter) => {
    const isSelected = selectedFilter?.name === filter.name;
    const itemContent = { source: isSelected ? (preview == "" ? filter.thumbnail : preview) : filter.thumbnail };
    return (
      <Grid.Item
        title={filter.name}
        id={filter.name}
        subtitle={filter.description}
        key={filter.name}
        content={itemContent}
        actions={
          <ActionPanel>
            <Action
              title={`Apply ${filter.name} Filter`}
              onAction={async () => {
                const selectedImages = await getSelectedImages();
                await runOperation({
                  operation: () => applyFilter(selectedImages, filter),
                  selectedImages,
                  inProgressMessage: "Filtering in progress...",
                  successMessage: "Applied filter to",
                  failureMessage: "Failed to apply filter to",
                });
              }}
            />
          </ActionPanel>
        }
      />
    );
  });

  return (
    <Grid
      searchBarPlaceholder="Search filters..."
      throttle={true}
      onSelectionChange={async (id) => {
        const filter = filters.find((filter) => filter.name === id);
        if (filter && filter.name !== selectedFilter?.name) {
          setPreview("");
          setSelectedFilter(filter);
          const selection = await getSelectedImages();
          if (selection.length > 0 && selection[0].trim() !== "") {
            const preview = await getFilterThumbnail(filter, selection[0]);
            setPreview(preview);
          }
          await cleanup();
        }
      }}
    >
      {gridItems}
    </Grid>
  );
}
