import { List } from '@raycast/api';
import React, { useState, useCallback } from 'react';
import { SpaceListItem } from './components/space-list-item';
import { searchDocs, SearchDocsResponse as SearchResults } from './services/space';

const SearchDocsView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);

  const handleSearch = useCallback((text: string) => {
    setLoading(true);
    searchDocs({ query: text })
      .then((results) => {
        setLoading(false);
        setSearchResults(results);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <List isLoading={loading} searchBarPlaceholder="Search docs..." onSearchTextChange={handleSearch} throttle>
      {searchResults?.tokens.map((nodeId) => {
        const objEntity = searchResults.entities.objs[nodeId];
        const ownerEntity = searchResults.entities.users[objEntity.owner_id];

        return <SpaceListItem key={nodeId} node={objEntity} owner={ownerEntity} />;
      })}
    </List>
  );
};

export default SearchDocsView;
