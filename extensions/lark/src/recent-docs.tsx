import { List } from '@raycast/api';
import React, { useState, useEffect } from 'react';
import { SpaceListItem } from './components/space-list-item';
import { fetchRecentList, RecentListResponse as RecentList } from './services/space';

const RecentListView: React.FC = () => {
  const [recentList, setRecentList] = useState<RecentList | null>(null);

  useEffect(() => {
    fetchRecentList().then((list) => setRecentList(list));
  }, []);

  return (
    <List isLoading={recentList === null} searchBarPlaceholder="Search recent list...">
      {recentList?.node_list.map((nodeId) => {
        const nodeEntity = recentList.entities.nodes[nodeId];
        const ownerEntity = recentList.entities.users[nodeEntity.owner_id];

        return <SpaceListItem key={nodeId} node={nodeEntity} owner={ownerEntity} />;
      })}
    </List>
  );
};

export default RecentListView;
