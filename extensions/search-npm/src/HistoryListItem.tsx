import { List, ActionPanel, Action, Icon } from '@raycast/api'
import {
  removeItemFromHistory,
  removeAllItemsFromHistory,
  getHistory,
} from './utils/history-storage'
import type { HistoryItem } from './utils/history-storage'
import { useId } from 'react'

interface HistoryListItemProps {
  item: HistoryItem
  setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>
}
export const HistoryListItem = ({
  item,
  setHistory,
  setSearchTerm,
}: HistoryListItemProps) => {
  const id = useId()
  return (
    <List.Item
      title={item.term}
      key={id}
      icon={item.type === 'search' ? Icon.MagnifyingGlass : Icon.Box}
      actions={
        <ActionPanel>
          <Action
            title="Search for this package"
            onAction={() => setSearchTerm(item.term)}
            icon={Icon.MagnifyingGlass}
          />
          <Action
            title="Remove this item from history"
            onAction={async () => {
              const history = await removeItemFromHistory(item)
              setHistory(history)
            }}
            icon={Icon.XMarkCircle}
          />
          <Action
            title="Clear all items from history"
            shortcut={{ modifiers: ['cmd'], key: 'backspace' }}
            onAction={async () => {
              await removeAllItemsFromHistory()
              const history = await getHistory()
              setHistory(history)
            }}
            icon={Icon.XMarkCircleFilled}
          />
        </ActionPanel>
      }
      accessories={[
        {
          icon: Icon.ArrowRightCircle,
          tooltip: 'Search for this package',
        },
      ]}
    />
  )
}
