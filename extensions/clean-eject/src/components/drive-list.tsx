import { ActionPanel, List } from '@raycast/api';
import { useExec } from '@raycast/utils';
import { useMemo } from 'react';

import { getQueryCommand, QueryAction } from '../actions/query';
import { parseVolumes } from '../utils';
import { DriveListItem } from './drive-list-item';

export const DriveList = () => {
  const { data, isLoading, revalidate } = useExec(getQueryCommand(), {
    shell: true,
    failureToastOptions: { title: 'Failed to query drives' },
  });

  const volumes = useMemo(() => parseVolumes(data), [data]);

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <QueryAction onQuery={revalidate} />
        </ActionPanel>
      }
    >
      {volumes.map((volume) => (
        <DriveListItem
          key={volume.id}
          volume={volume}
          revalidate={revalidate}
        />
      ))}
    </List>
  );
};
