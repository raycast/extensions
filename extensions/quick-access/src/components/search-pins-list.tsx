import React, { useMemo, useState } from "react";
import { List } from "@raycast/api";
import { FileInfo, Layout, TypeDirectoryEnum } from "../types/types";
import { DirectoryTagTypes } from "../utils/constants";
import { QuickAccessEmptyView } from "./quick-access-empty-view";
import { useShowDetail } from "../hooks/useShowDetail";
import { useFilePreview } from "../hooks/useFilePreview";
import { fileContentInfoInit } from "../types/file-content-info";
import { TagDropdown } from "./tag-dropdown";
import { usePinnedDirectories } from "../hooks/usePinnedDirectories";
import { useFrontmostApp } from "../hooks/useFrontmostApp";
import { SearchPinsListItem } from "./search-pins-list-item";

export function SearchPinsList() {
  const [tag, setTag] = useState<string>("All");
  const [fileInfo, setFileInfo] = useState<FileInfo | undefined>(undefined);

  const { data, isLoading, mutate } = usePinnedDirectories();
  const allDirectories = useMemo(() => {
    return data || [];
  }, [data]);
  const pinnedDirectories = useMemo(() => {
    if (!data) return [];
    return data[1].directories;
  }, [data]);

  const { data: showDetailData, mutate: showDetailMutate } = useShowDetail();
  const showDetail = useMemo(() => {
    if (!showDetailData) return true;
    return showDetailData;
  }, [showDetailData]);

  const { data: filePreviewData, isLoading: filePreviewLoading } = useFilePreview(fileInfo);
  const filePreview = useMemo(() => {
    if (!filePreviewData) return fileContentInfoInit;
    return filePreviewData;
  }, [filePreviewData]);

  const { data: frontmostApp } = useFrontmostApp();

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder={"Search files"}
      onSelectionChange={(id) => {
        if (typeof id === "string") {
          setFileInfo(JSON.parse(id));
        }
      }}
      searchBarAccessory={<TagDropdown directoryWithFiles={allDirectories} setTag={setTag} />}
    >
      <QuickAccessEmptyView layout={Layout.LIST} />
      {allDirectories.map((typeDirectory) =>
        typeDirectory.directories.map(
          (directory, directoryIndex) =>
            (tag == directory.directory.name || tag == "All" || DirectoryTagTypes.includes(tag)) && (
              <SearchPinsListItem
                key={typeDirectory.type + directory.directory.id + directoryIndex}
                isPinnedDirectories={typeDirectory.type === TypeDirectoryEnum.PinnedFolder}
                pinnedDirectories={pinnedDirectories}
                directory={directory}
                directoryIndex={directoryIndex}
                tag={tag}
                frontmostApp={frontmostApp}
                mutate={mutate}
                showDetail={showDetail}
                filePreviewLoading={filePreviewLoading}
                filePreview={filePreview}
                showDetailMutate={showDetailMutate}
              />
            ),
        ),
      )}
    </List>
  );
}
