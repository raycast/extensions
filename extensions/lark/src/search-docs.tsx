import { Action, Icon, List, showToast, Toast } from '@raycast/api';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SpaceListItem } from './components/space-list-item';
import { withAuth } from './features/with-auth';
import {
  fetchRecentList,
  searchDocs,
  removeRecentDocument,
  RecentListResponse as RecentList,
  SearchDocsResponse as SearchResults,
} from './services/space';
import { noop } from './utils/function';
import { getStorage, setStorage, StorageKey } from './utils/storage';

const SearchDocsView: React.FC = () => {
  const fetchIdRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [documentList, setDocumentList] = useState<RecentList | SearchResults | null>(null);

  useEffect(() => {
    // load cache
    getStorage(StorageKey.DocsRecentList)
      .then((cache) => setDocumentList(cache))
      .catch(noop)
      .then(handleFetchRecentList);
  }, []);

  const handleFetchRecentList = () => {
    // load recent list
    setLoading(true);
    const id = ++fetchIdRef.current;

    fetchRecentList()
      .then((recentList) => {
        if (fetchIdRef.current === id) {
          setLoading(false);
          // set cache
          setStorage(StorageKey.DocsRecentList, recentList);
          setDocumentList(recentList);
        }
      })
      .catch(() => {
        if (fetchIdRef.current === id) {
          setLoading(false);
        }
      });
  };

  const handleSearch = useCallback((text: string) => {
    setLoading(true);
    const id = ++fetchIdRef.current;

    searchDocs({ query: text })
      .then((searchResults) => {
        if (fetchIdRef.current === id) {
          setLoading(false);
          setDocumentList(searchResults);
        }
      })
      .catch(() => {
        if (fetchIdRef.current === id) {
          setLoading(false);
        }
      });
  }, []);

  const handleRemoveRecent = async (objToken: string) => {
    const result = await removeRecentDocument(objToken);
    if (result) {
      showToast(Toast.Style.Success, 'Removed successfully');
      handleFetchRecentList();
    }
  };

  return (
    <List isLoading={loading} searchBarPlaceholder="Search documents..." onSearchTextChange={handleSearch} throttle>
      {documentList != null && documentList.entities ? (
        isRecentList(documentList) ? (
          <RecentDocumentsView list={documentList} onRemove={handleRemoveRecent} />
        ) : (
          <SearchResultView list={documentList} />
        )
      ) : null}
    </List>
  );
};

const isRecentList = (list: RecentList | SearchResults): list is RecentList => {
  return 'nodes' in list.entities;
};

const RecentDocumentsView: React.FC<{
  list: RecentList;
  onRemove?: (objToken: string) => void;
}> = ({ list, onRemove }) => {
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
              <>
                <Action
                  icon={Icon.Trash}
                  title="Remove From Recent Documents"
                  shortcut={{ key: 'x', modifiers: ['ctrl'] }}
                  onAction={() => onRemove?.(nodeId)}
                />
              </>
            }
          />
        );
      })}
    </List.Section>
  );
};

const SearchResultView: React.FC<{ list: SearchResults }> = ({ list }) => {
  return (
    <List.Section title="Search Results" subtitle={`${list.tokens.length}`}>
      {list.tokens.map((nodeId) => {
        const objEntity = list.entities.objs[nodeId];
        const ownerEntity = list.entities.users[objEntity.owner_id];

        return <SpaceListItem key={nodeId} node={objEntity} owner={ownerEntity} />;
      })}
    </List.Section>
  );
};

export default withAuth(SearchDocsView);
