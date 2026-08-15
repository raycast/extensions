import { ActionPanel, List, Icon } from '@raycast/api';

import { BoardGame } from '../models';

import Details from './Details';
import UrlActions from './UrlActions';

interface ListItemProps {
  item: BoardGame;
}

export default function ListItem({ item }: ListItemProps) {
  return (
    <List.Item
      title={item.title}
      icon={Icon.ChessPiece}
      detail={<Details item={item} />}
      actions={
        <ActionPanel>
          <UrlActions item={item} />
        </ActionPanel>
      }
    />
  );
}
