/**
 * @file apply-filter.tsx
 *
 * @summary Raycast command to apply filters on selected images.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:52:33
 */

import { statSync } from "fs";
import { useRef, useState } from "react";

import { Action, ActionPanel, getPreferenceValues, Grid, Icon, Image } from "@raycast/api";

import applyFilter from "./operations/filterOperation";
import runOperation from "./operations/runOperation";
import { getActiveFilters, getFilterThumbnail } from "./utilities/filters";
import { Filter } from "./utilities/types";
import { cleanup, getSelectedImages } from "./utilities/utils";

type FilterGridItemProps = {
  filter: Filter;
  content?: Image.ImageLike;
};

function FilterGridItem({ filter, content }: FilterGridItemProps) {
  return (
    <Grid.Item
      title={filter.name}
      id={filter.CIFilterName}
      accessory={{ icon: { source: Icon.Info }, tooltip: filter.description }}
      subtitle={filter.category}
      key={filter.CIFilterName}
      content={content || { source: filter.thumbnail }}
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
}

export default function Command() {
  const [selectedFilter, setSelectedFilter] = useState<Filter>();
  const [preview, setPreview] = useState<string>("");
  const previewQueue = useRef([] as string[]);
  const preferences = getPreferenceValues<Preferences.ApplyFilter>();
  return (
    <Grid
      searchBarPlaceholder="Search filters..."
      onSelectionChange={async (id) => {
        if (!preferences.showPreviews || !id) {
          return;
        }
        previewQueue.current.push(id);
        setTimeout(async () => {
          if (previewQueue.current.at(-1) == id) {
            const filter = getActiveFilters().find((filter) => filter.CIFilterName === id);
            if (filter && filter.name !== selectedFilter?.name) {
              setPreview("");
              setSelectedFilter(filter);
              const filePath = (await getSelectedImages()).at(0);
              if (filePath && filePath.trim() !== "") {
                if (statSync(filePath).size < 800000) {
                  const preview = await getFilterThumbnail(filter, filePath);
                  setPreview(preview);
                }
              }
              await cleanup();
            }
          }
          previewQueue.current = previewQueue.current.filter((item) => item !== id);
        }, 500);
      }}
    >
      {getActiveFilters().map((filter) => {
        return (
          <FilterGridItem
            key={filter.CIFilterName}
            filter={filter}
            content={selectedFilter?.name === filter.name ? preview : undefined}
          />
        );
      })}
    </Grid>
  );
}
