import { Action, ActionPanel, Icon, List } from '@raycast/api'

type NoItemsProps = {
  onReset?: () => void
}
export const NoItems = ({ onReset }: NoItemsProps) => {
  return (
    <List.Item
      title="No items found"
      icon={Icon.ExclamationMark}
      actions={
        <ActionPanel>
          <Action onAction={onReset} title="Reset" />
        </ActionPanel>
      }
    />
  )
}
