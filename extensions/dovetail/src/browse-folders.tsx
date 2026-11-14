import { Icon, List } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { BaseUrl, buildHeaders, FoldersResponse } from "./api/endpoints";
import { FolderRow } from "./components/FolderRow";
import { useAuth } from "./hooks/useAuth";

export default function BrowseFolders() {
  const { token } = useAuth();

  // The API's `filter[parent_folder_id]=null` only accepts a real JSON null, not the literal
  // query string "null", so root folders are filtered out of the response client-side instead.
  const { data, isLoading } = useFetch(BaseUrl + `/v1/folders?sort=title:asc&page[limit]=100`, {
    headers: buildHeaders(token),
    parseResponse: async (response) => {
      const json = await response.json();
      return FoldersResponse.parse(json);
    },
    onError: (error) => {
      showFailureToast(error, { title: "Failed to load folders" });
    },
  });

  const folders = (data?.data ?? []).filter((folder) => !folder.parent_folder);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter folders...">
      <List.EmptyView icon={Icon.Folder} title="No folders in this workspace" />
      {folders.map((folder) => (
        <FolderRow key={folder.id} folder={{ ...folder, url: folder.url ?? undefined }} />
      ))}
    </List>
  );
}
