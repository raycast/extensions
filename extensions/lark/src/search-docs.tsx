import React, { useState } from "react";
import { Action, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SpaceListItem } from "./components/space-list-item";
import { withAuth } from "./features/with-auth";
import { withQuery } from "./features/with-query";
import {
  fetchRecentDocsList,
  searchDocs,
  removeRecentDocument,
  RecentDocsListResponse as RecentList,
  SearchDocsResponse as SearchResults,
} from "./services/space";
import { StorageKey } from "./utils/storage";
import { preference } from "./utils/config";

function SearchDocsView() {
  const [cachedRecentList, setCachedRecentList] = useCachedState<RecentList | null>(StorageKey.DocsRecentList, null);
  const [searchKeywords, setSearchKeywords] = useState("");
  const {
    isFetching,
    data: documentList,
    refetch,
  } = useQuery<SearchResults | RecentList | null>({
    queryKey: ["SearchDocsView", searchKeywords],
    queryFn: ({ signal }) =>
      searchKeywords
        ? searchDocs({ query: searchKeywords }, signal)
        : fetchRecentDocsList(preference.recentListCount, signal).then((data) => {
            setCachedRecentList(data);
            return data;
          }),
    placeholderData: (previousData) => keepPreviousData(previousData) || cachedRecentList,
  });

  const handleRemoveRecent = async (objToken: string) => {
    showToast({ title: "Removing", style: Toast.Style.Animated });
    const result = await removeRecentDocument(objToken);
    if (result) {
      showToast(Toast.Style.Success, "Removed successfully");
      refetch();
    }
  };

  return (
    <List
      isLoading={isFetching}
      searchBarPlaceholder="Search documents..."
      onSearchTextChange={setSearchKeywords}
      throttle
    >
      {documentList != null && documentList.entities ? (
        isRecentList(documentList) ? (
          <RecentDocumentsView list={documentList} onRemove={handleRemoveRecent} />
        ) : (
          <SearchResultView list={documentList} />
        )
      ) : null}
    </List>
  );
}

const isRecentList = (list: RecentList | SearchResults): list is RecentList => {
  return "nodes" in list.entities;
};

function RecentDocumentsView({ list, onRemove }: { list: RecentList; onRemove?: (objToken: string) => void }) {
  return (
    <List.Section title="Recent Documents" subtitle={`${list.node_list.length}`}>
      {list.node_list.map((nodeId) => {
        const nodeEntity = list.entities.nodes[nodeId];
        const ownerEntity = list.entities.users[nodeEntity.owner_id];

        return (
          <SpaceListItem
            key={nodeId}
            node={nodeEntity}
            owner={ownerEntity}
            actions={
              <Action
                icon={Icon.Trash}
                title="Remove from Recent Documents"
                shortcut={{ key: "x", modifiers: ["ctrl"] }}
                onAction={() => onRemove?.(nodeId)}
              />
            }
          />
        );
      })}
    </List.Section>
  );
}

function SearchResultView({ list }: { list: SearchResults }) {
  return (
    <List.Section title="Search Results" subtitle={`${list.tokens.length}`}>
      {list.tokens.map((nodeId) => {
        const objEntity = list.entities.objs[nodeId];
        const ownerEntity = list.entities.users[objEntity.owner_id];

        return <SpaceListItem key={nodeId} node={objEntity} owner={ownerEntity} />;
      })}
    </List.Section>
  );
}

export default withAuth(withQuery(SearchDocsView));
