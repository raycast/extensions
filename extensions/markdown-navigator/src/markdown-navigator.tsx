import { List, showToast, Toast, Icon, getPreferenceValues, useNavigation } from "@raycast/api";
import { usePromise, showFailureToast } from "@raycast/utils";
import { useState, useEffect, useCallback } from "react";
import fs from "fs";
import { getMarkdownFiles } from "./utils/fileOperations";
import { getAllUniqueTags, isSystemTag, getSystemTag } from "./utils/tagOperations";
import { groupFilesByFolder } from "./utils/groupOperations";
import { CreateFileForm } from "./components/CreateFileForm";
import { FileListItem } from "./components/FileListItem";
import { PaginationSection } from "./components/PaginationSection";
import { CommonActions, LoadMoreAction } from "./components/ActionComponents";
import { MarkdownEmptyView } from "./components/MarkdownEmptyView";
import { TagSearchList } from "./components/TagSearchList";
import path from "path";
import { getTagTintColor } from "./utils/tagColorUtils";
import { clearMarkdownFilesCache } from "./utils/fileOperations";
export const markdownDir = getPreferenceValues<{ markdownDir: string }>().markdownDir;

const ITEMS_PER_PAGE = 20;
const INITIAL_LOAD_LIMIT = 50;
const LOAD_INCREMENT = 50;

export default function Command() {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showColorTags, setShowColorTags] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [loadLimit, setLoadLimit] = useState<number>(INITIAL_LOAD_LIMIT);
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [rootDirectory, setRootDirectory] = useState<string>(markdownDir);

  // Validate markdownDir
  useEffect(() => {
    if (!markdownDir || !fs.existsSync(markdownDir)) {
      showFailureToast({
        title: "Invalid Markdown Directory",
        message: "Please set a valid directory in preferences.",
      });
    } else {
      setRootDirectory(markdownDir);
    }
  }, [markdownDir]);

  // Initialize total files count
  useEffect(() => {
    const getTotalFiles = async () => {
      try {
        if (!markdownDir || !fs.existsSync(markdownDir)) {
          console.log("Invalid markdown directory, skipping file count");
          return;
        }

        const allFiles = await getMarkdownFiles();
        setTotalFiles(allFiles.length);
        console.log(`Total files in ${markdownDir}: ${allFiles.length}`);
      } catch (error) {
        console.error(`Error getting total files from ${markdownDir}:`, error);
      }
    };

    getTotalFiles();
  }, [markdownDir]);

  // Define the fetch function
  const fetchMarkdownFiles = useCallback(async () => {
    console.log(`Fetching files with limit: ${loadLimit}`);
    const files = await getMarkdownFiles(loadLimit);
    console.log(`Loaded ${files.length} files, limit: ${loadLimit}, total: ${totalFiles}`);
    return files;
  }, [loadLimit, totalFiles]);

  // Get the Markdown files
  const { data, isLoading, error, revalidate } = usePromise(fetchMarkdownFiles, [], {
    execute: true,
  });

  // Handle errors
  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Loading Markdown files failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [error]);

  // Debug log for key variables
  useEffect(() => {
    console.log(`loadLimit: ${loadLimit}, totalFiles: ${totalFiles}, selectedTag: ${selectedTag}`);
  }, [loadLimit, totalFiles, selectedTag]);

  // Reload files when loadLimit changes
  useEffect(() => {
    revalidate();
  }, [loadLimit, revalidate]);
  useEffect(() => {
    if (selectedTag !== undefined) {
      // Skip the initial render
      console.log("Revalidating due to tag change:", selectedTag);
      revalidate();
    }
  }, [selectedTag, revalidate]);
  // Filtering and paging data
  const filteredData = data
    ? data.filter(
        (file) =>
          (file.name.toLowerCase().includes(searchText.toLowerCase()) ||
            file.folder.toLowerCase().includes(searchText.toLowerCase())) &&
          (!selectedTag || file.tags.includes(selectedTag)),
      )
    : [];

  console.log("Filtered data count:", filteredData.length);
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
  console.log("Paginated data count:", paginatedData.length);

  // Calculate the current page display range
  const startItem = currentPage * ITEMS_PER_PAGE + 1;
  const endItem = Math.min((currentPage + 1) * ITEMS_PER_PAGE, filteredData.length);
  const pageInfoText =
    filteredData.length > 0
      ? `Showing ${startItem}-${endItem} of ${filteredData.length} (Total ${totalFiles} files)`
      : "File not found";

  const forceRevalidate = useCallback(async () => {
    console.log("Force revalidating file list");

    await clearMarkdownFilesCache();
    revalidate();
  }, [revalidate]);
  // Navigate to the Create File form
  const showCreateFileForm = () => {
    push(
      <CreateFileForm rootDirectory={rootDirectory} currentFolder={selectedFolder} onFileCreated={forceRevalidate} />,
    );
  };

  // Get all tags
  const allTags = data ? getAllUniqueTags(data, showColorTags) : [];

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

  // Load more files action
  const loadMoreFiles = () => {
    if (loadLimit < totalFiles) {
      setLoadLimit((prevLimit) => {
        const newLimit = prevLimit + LOAD_INCREMENT;
        console.log(`Increasing load limit from ${prevLimit} to ${newLimit}`);

        // Display a Toast after the status is updated
        setTimeout(() => {
          showToast({
            style: Toast.Style.Success,
            title: "Loading more files",
            message: `Increasing limit from ${prevLimit} to ${newLimit}`,
          });
        }, 0);

        return newLimit;
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "All files loaded",
        message: `Already loaded all ${totalFiles} files`,
      });
    }
  };

  // Handle tag selection
  const handleTagSelect = (tag: string) => {
    setSelectedTag(tag || null);
    setCurrentPage(0);
  };

  // Show tag search list
  const showTagSearchList = () => {
    console.log("Showing tag search list");
    push(<TagSearchList tags={allTags} onTagSelect={handleTagSelect} selectedTag={selectedTag} showSections={true} />);
  };

  const commonActionsProps = {
    showCreateFileForm,
    revalidate,
    loadMoreFiles,
    showColorTags,
    setShowColorTags,
    selectedTag,
    setSelectedTag,
    showTagSearchList,
  };

  // Common actions for both main view and empty view
  const commonActions = <CommonActions {...commonActionsProps} />;

  // Add a footer section to display load status
  const renderFooter = () => {
    if (loadLimit < totalFiles) {
      return (
        <List.Item
          title={`Loaded ${loadLimit} of ${totalFiles} files`}
          icon={Icon.Plus}
          actions={<LoadMoreAction loadMoreFiles={loadMoreFiles} />}
        />
      );
    }
    return null;
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search file name or folder..."
      onSearchTextChange={(text) => {
        setSearchText(text);
        setCurrentPage(0);
        console.log("Search text changed:", text);
      }}
      searchText={searchText}
      navigationTitle={`Markdown files (${filteredData.length} items)`}
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
      onSelectionChange={(id) => {
        if (id) {
          const file = paginatedData.find((f) => f.path === id);
          if (file) {
            setSelectedFolder(file.folder);
            console.log("Selected folder:", file.folder);
          }
        }
      }}
    >
      {filteredData.length > 0 ? (
        <>
          {/* Page navigation */}
          {totalPages > 1 && (
            <PaginationSection
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
              revalidate={revalidate}
              pageInfoText={pageInfoText}
              loadMoreFiles={loadMoreFiles}
              showTagSearchList={showTagSearchList}
              selectedTag={selectedTag}
              setSelectedTag={setSelectedTag}
              showColorTags={showColorTags}
              setShowColorTags={setShowColorTags}
            />
          )}

          {/* Group by folder */}
          {Object.entries(groupFilesByFolder(paginatedData)).map(([folder, files]) => (
            <List.Section key={folder} title={folder} subtitle={`${files.length} files`}>
              {files.map((file) => (
                <FileListItem
                  key={file.path}
                  file={file}
                  showColorTags={showColorTags}
                  setShowColorTags={setShowColorTags}
                  revalidate={revalidate}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  setCurrentPage={setCurrentPage}
                  markdownDir={rootDirectory}
                  loadMoreFiles={loadMoreFiles}
                  showCreateFileForm={showCreateFileForm}
                  showTagSearchList={showTagSearchList}
                  selectedTag={selectedTag}
                  setSelectedTag={setSelectedTag}
                />
              ))}
            </List.Section>
          ))}

          {/* Load more footer */}
          {renderFooter()}
        </>
      ) : (
        <MarkdownEmptyView isLoading={isLoading} error={error} selectedTag={selectedTag} actions={commonActions} />
      )}
    </List>
  );
}
