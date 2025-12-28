import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";

import { File, getFileParentsById, getFiles, QueryTypes, ScopeTypes } from "./api/getFiles";
import FileListItem from "./components/FileListItem";

import { getUserEmail } from "./api/googleAuth";
import { withGoogleAuth } from "./components/withGoogleAuth";

function getSectionTitle(queryType: QueryTypes): string {
  if (queryType === QueryTypes.fullText) {
    return "Results";
  }
  return "Recently Used";
}

function SearchGoogleDriveFiles() {
  const [query, setQuery] = useState("");
  const [queryType, setQueryType] = useCachedState<QueryTypes>("query type", QueryTypes.fileName);
  const [scopeType, setScopeType] = useCachedState<ScopeTypes>("scope type", ScopeTypes.allDrives);
  const [parentId, setParentId] = useState<string | undefined>(undefined);

  const email = getUserEmail();

  const { data, isLoading } = useCachedPromise(
    async (queryType: QueryTypes, scopeType: ScopeTypes, query: string, parentId?: string) =>
      await getFiles({ queryType, queryText: query, scope: scopeType, parentId }),
    [queryType, scopeType, query, parentId],
    { failureToastOptions: { title: "Failed to retrieve files" } },
  );

  const enterDirectory = (file: File) => {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      setParentId(file.id);
      setQuery(""); // clear search when entering folder
    }
  };

  const goToParent = async () => {
    if (!parentId) return;
    const parents = await getFileParentsById(parentId);
    setParentId(parents.length > 0 ? parents[0] : undefined);
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={true}
      searchBarPlaceholder="Search in Drive"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search mode"
          placeholder="Filter by"
          value={`${queryType}-${scopeType}`}
          onChange={(value) => {
            const [queryType, scopeType] = value.split("-");
            setQueryType(queryType as QueryTypes);
            setScopeType(scopeType as ScopeTypes);
          }}
        >
          <List.Dropdown.Item title="File Name in My Drive" value={`${QueryTypes.fileName}-${ScopeTypes.user}`} />
          <List.Dropdown.Item
            title="File Name in All Drives"
            value={`${QueryTypes.fileName}-${ScopeTypes.allDrives}`}
          />
          <List.Dropdown.Item title="Content in My Drive" value={`${QueryTypes.fullText}-${ScopeTypes.user}`} />
          <List.Dropdown.Item title="Content in All Drives" value={`${QueryTypes.fullText}-${ScopeTypes.allDrives}`} />
          <List.Dropdown.Item title="Starred in My Drive" value={`${QueryTypes.starred}-${ScopeTypes.user}`} />
          <List.Dropdown.Item title="Starred in All Drives" value={`${QueryTypes.starred}-${ScopeTypes.allDrives}`} />
        </List.Dropdown>
      }
      onSearchTextChange={setQuery}
      throttle
    >
      <List.EmptyView
        title={parentId ? "No files in this folder" : "No files found"}
        description={parentId ? undefined : "Try adjusting your search or filter"}
        icon={{ source: "google-drive.svg", tintColor: Color.SecondaryText }}
        actions={
          <ActionPanel>
            {parentId && (
              <Action
                title="Go to Parent Directory"
                icon={Icon.ArrowLeft}
                onAction={goToParent}
                shortcut={{ modifiers: ["shift"], key: "tab" }}
              />
            )}
          </ActionPanel>
        }
      />

      {data?.files && data.files.length > 0 && (
        <List.Section title={getSectionTitle(queryType)} subtitle={`${data.files.length}`}>
          {data.files.map((file) => (
            <FileListItem
              file={file}
              key={file.id}
              email={email}
              onEnterDirectory={(file) => enterDirectory(file)}
              goToParent={goToParent}
              currentParentId={parentId}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default withGoogleAuth(SearchGoogleDriveFiles);
