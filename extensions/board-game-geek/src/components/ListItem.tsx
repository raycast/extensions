import { Action, ActionPanel, List, Icon, useNavigation } from '@raycast/api';

import { BoardGame } from '../models';
import useHistory from '../useHistory';
import Details from './Details';
import UrlActions from './UrlActions';

interface ListItemProps {
  item: BoardGame;
}

export default function ListItem({ item }: ListItemProps) {
  const { push } = useNavigation();
  const { addToHistory } = useHistory();

  return (
    <List.Item
      title={item.title}
      icon={Icon.ChessPiece}
      actions={
        <ActionPanel>
          <Action
            title="View Details"
            icon={Icon.AppWindowSidebarRight}
            onAction={() => {
              addToHistory(item);
              push(<Details item={item} />);
            }}
          />
          <UrlActions item={item} />
        </ActionPanel>
      }
    />
  );
}
