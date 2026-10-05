import { List } from '@raycast/api';
import { HistoryListItem } from './history/history-list-item';
import { useHistory } from './history/use-history';

export default function Command() {
  const { history, isLoading, pagination, updateHistory, deleteHistory, purgeHistory } = useHistory();

  return (
    <List isLoading={isLoading} pagination={pagination} searchBarPlaceholder="Search history...">
      {history?.map((item) => (
        <HistoryListItem
          key={item.id}
          item={item}
          onDelete={deleteHistory}
          onPurge={purgeHistory}
          onUpdate={updateHistory}
        />
      ))}
    </List>
  );
}
