import { Action, ActionPanel, Icon, List } from '@raycast/api';
import { Cast } from '../utils/types';
import { getUserIcon, getCastUrl } from '../utils/helpers';
import CastDetails from './CastDetails';

export default function CastListItem({ cast }: { cast: Cast }) {
  const isPowerUser = cast.author.power_badge;
  const accessories: List.Item.Accessory[] = [
    ...(isPowerUser ? [{ icon: 'power-badge.png' }] : []),
    { date: new Date(cast.timestamp) },
    {
      icon: getUserIcon(cast.author),
      tooltip: `Author: ${cast.author.username}`,
    },
  ];

  return (
    <List.Item
      title={cast.text}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" icon={Icon.Sidebar} target={<CastDetails cast={cast} />} />
          <Action.OpenInBrowser title="Open in Browser" url={getCastUrl(cast)} />
        </ActionPanel>
      }
    />
  );
}
