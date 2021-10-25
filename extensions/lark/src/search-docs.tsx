import { List } from '@raycast/api';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SpaceListItem } from './components/space-list-item';
import {
  fetchRecentList,
  searchDocs,
  setRecentListCache,
  getRecentListCache,
  RecentListResponse as RecentList,
  SearchDocsResponse as SearchResults,
} from './services/space';

const SearchDocsView: React.FC = () => {
  const fetchIdRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [documentList, setDocumentList] = useState<RecentList | SearchResults | null>(null);

  useEffect(() => {
    // load cache
    getRecentListCache()
      .then((cache) => setDocumentList(cache))
      .catch(() => {
        // noop
      });

    // load recent list
    setLoading(true);
    const id = ++fetchIdRef.current;

    fetchRecentList()
      .then((recentList) => {
        if (fetchIdRef.current === id) {
          setLoading(false);
          // set cache
          setRecentListCache(recentList);
          setDocumentList(recentList);
        }
      })
      .catch(() => {
        if (fetchIdRef.current === id) {
          setLoading(false);
        }
      });
  }, []);

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

  return (
    <List isLoading={loading} searchBarPlaceholder="Search documents..." onSearchTextChange={handleSearch} throttle>
      {documentList !== null ? (
        isRecentList(documentList) ? (
          <RecentListView list={documentList} />
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

const RecentListView: React.FC<{ list: RecentList }> = ({ list }) => {
  return (
    <List.Section title="Recent Documents" subtitle={`${list.node_list.length}`}>
      {list.node_list.map((nodeId) => {
        const nodeEntity = list.entities.nodes[nodeId];
        const ownerEntity = list.entities.users[nodeEntity.owner_id];

        return <SpaceListItem key={nodeId} node={nodeEntity} owner={ownerEntity} />;
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

export default SearchDocsView;
