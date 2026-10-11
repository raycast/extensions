import { List } from '@raycast/api';
import { formatDateTime } from '../utils';
import { HistoryActions } from './history-actions';
import type { HistoryFormValues, HistoryItem } from './types';

type Props = {
  item: HistoryItem;
  onDelete: (item: HistoryItem) => Promise<void>;
  onPurge: () => Promise<void>;
  onUpdate: (id: number, values: HistoryFormValues) => Promise<void>;
};

export function HistoryListItem({ item, onDelete, onPurge, onUpdate }: Props) {
  return (
    <List.Item
      title={item.result ?? ''}
      subtitle={item.word}
      accessories={[{ text: formatDateTime(item.createdAt) }]}
      actions={<HistoryActions item={item} onDelete={onDelete} onPurge={onPurge} onUpdate={onUpdate} />}
    />
  );
}
