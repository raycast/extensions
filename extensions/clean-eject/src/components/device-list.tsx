import { ActionPanel, List } from '@raycast/api';
import { useExec } from '@raycast/utils';
import { useMemo } from 'react';

import { getQueryCommand, QueryAction } from '../actions/query';
import { parseVolumes } from '../utils';
import { DeviceListItem } from './device-list-item';

export const DeviceList = () => {
  const { data, isLoading, revalidate } = useExec(getQueryCommand(), {
    shell: true,
    failureToastOptions: { title: 'Failed to query storage devices' },
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
        <DeviceListItem
          key={volume.id}
          volume={volume}
          revalidate={revalidate}
        />
      ))}
    </List>
  );
};
