import React, { useMemo, useState } from "react";
import { Grid } from "@raycast/api";
import { Layout, TypeDirectoryEnum } from "../types/types";
import { DirectoryTagTypes } from "../utils/constants";
import { QuickAccessEmptyView } from "./quick-access-empty-view";
import { columns, itemInset } from "../types/preferences";
import { TagDropdown } from "./tag-dropdown";
import { usePinnedDirectories } from "../hooks/usePinnedDirectories";
import { useFrontmostApp } from "../hooks/useFrontmostApp";
import { SearchPinsGridItem } from "./search-pins-grid-item";

export function SearchPinsGrid() {
  const [tag, setTag] = useState<string>("All");
  const { data, isLoading, mutate } = usePinnedDirectories();

  const allDirectories = useMemo(() => {
    return data || [];
  }, [data]);
  const pinnedDirectories = useMemo(() => {
    if (!data) return [];
    return data[1].directories;
  }, [data]);

  const { data: frontmostApp } = useFrontmostApp();

  return (
    <Grid
      isLoading={isLoading}
      columns={parseInt(columns)}
      aspectRatio={"4/3"}
      inset={itemInset as Grid.Inset}
      fit={Grid.Fit.Contain}
      searchBarPlaceholder={"Search files"}
      searchBarAccessory={<TagDropdown directoryWithFiles={allDirectories} setTag={setTag} />}
    >
      <QuickAccessEmptyView layout={Layout.GRID} />
      {allDirectories.map((typeDirectory) =>
        typeDirectory.directories.map(
          (directory, directoryIndex) =>
            (tag == directory.directory.name || tag == "All" || DirectoryTagTypes.includes(tag)) && (
              <SearchPinsGridItem
                key={typeDirectory.type + directory.directory.id + directoryIndex}
                isPinnedDirectories={typeDirectory.type === TypeDirectoryEnum.PinnedFolder}
                pinnedDirectories={pinnedDirectories}
                directory={directory}
                directoryIndex={directoryIndex}
                tag={tag}
                frontmostApp={frontmostApp}
                mutate={mutate}
              />
            ),
        ),
      )}
    </Grid>
  );
}
