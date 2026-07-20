import { List, Icon, getPreferenceValues, useNavigation } from "@raycast/api";
import { usePromise, showFailureToast } from "@raycast/utils";
import { useState, useEffect, useCallback, useMemo } from "react";
import fs from "fs";
import { getMarkdownFiles, clearMarkdownFilesCache } from "./utils/fileOperations";
import { getAllUniqueTags, isSystemTag, getSystemTag } from "./utils/tagOperations";
import { groupFilesByFolder } from "./utils/groupOperations";
import { CreateFileForm } from "./components/CreateFileForm";
import { FileListItem } from "./components/FileListItem";
import { PaginationSection } from "./components/PaginationSection";
import { CommonActions } from "./components/ActionComponents";
import { MarkdownEmptyView } from "./components/MarkdownEmptyView";
import { TagSearchList } from "./components/TagSearchList";
import path from "path";
import { getTagTintColor } from "./utils/tagColorUtils";

export const markdownDir = getPreferenceValues<{ markdownDir: string }>().markdownDir;

const ITEMS_PER_PAGE = 20;

export default function Command() {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showColorTags, setShowColorTags] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [rootDirectory, setRootDirectory] = useState<string>(markdownDir);

  // Extracted shared function for directory validation
  const isValidMarkdownDir = useCallback(() => {
    if (!markdownDir || !fs.existsSync(markdownDir)) {
      console.log("Invalid markdown directory");
      return false;
    }
    return true;
  }, []);

  // Validate markdownDir
  useEffect(() => {
    if (!isValidMarkdownDir()) {
      showFailureToast({
        title: "Invalid Markdown Directory",
        message: "Please set a valid directory in preferences.",
      });
    } else {
      setRootDirectory(markdownDir);
    }
  }, [markdownDir, isValidMarkdownDir]);

  // Define the fetch function
  const fetchMarkdownFiles = useCallback(async () => {
    console.log("Fetching Markdown files");
    const files = await getMarkdownFiles();
    console.log(`Loaded ${files.length} files`);
    return files;
  }, []);

  // Get the Markdown files
  const { data, isLoading, error, revalidate } = usePromise(fetchMarkdownFiles, [], {
    execute: true,
  });

  // Handle errors
  useEffect(() => {
    if (error) {
      showFailureToast("Loading Markdown files failed", error);
    }
  }, [error]);

  // Filtering and paging data
  const filteredData = useMemo(() => {
    return data
      ? data.filter(
          (file) =>
            (file.name.toLowerCase().includes(searchText.toLowerCase()) ||
              file.folder.toLowerCase().includes(searchText.toLowerCase())) &&
            (!selectedTag || file.tags.includes(selectedTag)),
        )
      : [];
  }, [data, searchText, selectedTag]);

  console.log("Filtered data count:", filteredData.length);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const totalFiles = data?.length ?? 0;

  const paginatedData = useMemo(() => {
    return filteredData.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  console.log("Paginated data count:", paginatedData.length);

  // Use useMemo to optimize the grouping operation
  const groupedData = useMemo(() => {
    console.log("Computing grouped data");
    return groupFilesByFolder(paginatedData);
  }, [paginatedData]);

  // Calculate the current page display range
  const pageInfoText = useMemo(() => {
    const startItem = currentPage * ITEMS_PER_PAGE + 1;
    const endItem = Math.min((currentPage + 1) * ITEMS_PER_PAGE, filteredData.length);
    return filteredData.length > 0
      ? `Showing ${startItem}-${endItem} of ${filteredData.length} (Total ${totalFiles} files)`
      : "File not found";
  }, [currentPage, filteredData.length, totalFiles]);

  const forceRevalidate = useCallback(async () => {
    console.log("Force revalidating file list");
    await clearMarkdownFilesCache();
    revalidate();
  }, [revalidate]);

  // Navigate to the Create File form
  const showCreateFileForm = useCallback(() => {
    push(
      <CreateFileForm rootDirectory={rootDirectory} currentFolder={selectedFolder} onFileCreated={forceRevalidate} />,
    );
  }, [push, rootDirectory, selectedFolder, forceRevalidate]);

  // Get all tags
  const allTags = useMemo(() => {
    return data ? getAllUniqueTags(data, showColorTags) : [];
  }, [data, showColorTags]);

  // Update rootDirectory if data is available
  useEffect(() => {
    if (data && data.length > 0 && !rootDirectory) {
      const firstFilePath = data[0].path;
      const folderPath = path.dirname(firstFilePath);
      const newRootDirectory = folderPath === markdownDir ? markdownDir : folderPath;

      setRootDirectory(newRootDirectory);
      console.log("Set root directory:", newRootDirectory);
    }
  }, [data, rootDirectory, markdownDir]);

  // Handle tag selection
  const handleTagSelect = useCallback((tag: string) => {
    setSelectedTag(tag || null);
    setCurrentPage(0);
  }, []);

  // Show tag search list
  const showTagSearchList = useCallback(() => {
    console.log("Showing tag search list");
    push(<TagSearchList tags={allTags} onTagSelect={handleTagSelect} selectedTag={selectedTag} showSections={true} />);
  }, [push, allTags, handleTagSelect, selectedTag]);

  const commonActionsProps = useMemo(
    () => ({
      showCreateFileForm,
      revalidate: forceRevalidate,
      showColorTags,
      setShowColorTags,
      selectedTag,
      setSelectedTag,
      showTagSearchList,
    }),
    [
      showCreateFileForm,
      forceRevalidate,
      showColorTags,
      setShowColorTags,
      selectedTag,
      setSelectedTag,
      showTagSearchList,
    ],
  );

  // Common actions for both main view and empty view
  const commonActions = <CommonActions {...commonActionsProps} />;

  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
    setCurrentPage(0);
    console.log("Search text changed:", text);
  }, []);

  const handleSelectionChange = useCallback(
    (id: string | null) => {
      if (id) {
        const file = paginatedData.find((f) => f.path === id);
        if (file) {
          setSelectedFolder(file.folder);
          console.log("Selected folder:", file.folder);
        }
      }
    },
    [paginatedData],
  );
  const navigationTitle = useMemo(() => {
    return `Markdown files (${filteredData.length} items)`;
  }, [filteredData.length]);
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search file name or folder..."
      onSearchTextChange={handleSearchTextChange}
      searchText={searchText}
      navigationTitle={navigationTitle}
      searchBarAccessory={
        allTags.length > 0 ? (
          <List.Dropdown tooltip="Filter by Tags" value={selectedTag || ""} onChange={handleTagSelect}>
            <List.Dropdown.Item title="All tags" value="" />

            {/* System Tags */}
            <List.Dropdown.Section title="System Tags">
              {allTags
                .filter((tag) => isSystemTag(tag))
                .map((tag) => {
                  const systemTag = getSystemTag(tag);
                  return (
                    <List.Dropdown.Item
                      key={tag}
                      title={`#${tag}`}
                      value={tag}
                      icon={{
                        source: Icon.Circle,
                        tintColor: isSystemTag(tag) ? getTagTintColor(true, systemTag) : undefined,
                      }}
                    />
                  );
                })}
            </List.Dropdown.Section>

            {/* Custom Tags */}
            <List.Dropdown.Section title="Custom Tags">
              {allTags
                .filter((tag) => !isSystemTag(tag))
                .map((tag) => (
                  <List.Dropdown.Item key={tag} title={`#${tag}`} value={tag} />
                ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
      actions={commonActions}
      onSelectionChange={handleSelectionChange}
    >
      {filteredData.length > 0 ? (
        <>
          {/* Page navigation */}
          {totalPages > 1 && (
            <PaginationSection
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
              revalidate={forceRevalidate}
              pageInfoText={pageInfoText}
              showTagSearchList={showTagSearchList}
              selectedTag={selectedTag}
              setSelectedTag={setSelectedTag}
              showColorTags={showColorTags}
              setShowColorTags={setShowColorTags}
            />
          )}

          {/* Group by folder - using memoized groupedData */}
          {Object.entries(groupedData).map(([folder, files]) => (
            <List.Section key={folder} title={folder} subtitle={`${files.length} files`}>
              {files.map((file) => (
                <FileListItem
                  key={file.path}
                  file={file}
                  showColorTags={showColorTags}
                  setShowColorTags={setShowColorTags}
                  revalidate={forceRevalidate}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  setCurrentPage={setCurrentPage}
                  markdownDir={rootDirectory}
                  showCreateFileForm={showCreateFileForm}
                  showTagSearchList={showTagSearchList}
                  selectedTag={selectedTag}
                  setSelectedTag={setSelectedTag}
                />
              ))}
            </List.Section>
          ))}
        </>
      ) : (
        <MarkdownEmptyView
          isLoading={isLoading}
          error={error || null}
          selectedTag={selectedTag}
          actions={commonActions}
        />
      )}
    </List>
  );
}
