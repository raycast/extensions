import { ActionPanel, List } from '@raycast/api';

import type { Volume } from '../types';
import { CleanAction } from '../actions/clean';
import { CleanEjectAction } from '../actions/clean-eject';
import { EjectAction } from '../actions/eject';
import { QueryAction } from '../actions/query';
import { getVolumeIcon } from '../utils';

type DriveListItemProps = {
  volume: Volume;
  revalidate: () => void;
};

export const DriveListItem = ({ volume, revalidate }: DriveListItemProps) => {
  return (
    <List.Item
      id={volume.id}
      icon={getVolumeIcon(volume)}
      title={volume.name}
      subtitle={volume.path}
      accessories={[
        { text: volume.format },
        { text: volume.size },
        { tag: volume.protocol },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={volume.name}>
            <CleanEjectAction volume={volume} onSuccess={revalidate} />
            <CleanAction volume={volume} />
            <EjectAction volume={volume} onSuccess={revalidate} />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <QueryAction onQuery={revalidate} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
