import {
    List,
    Icon,
    ActionPanel,
    OpenInBrowserAction,
  } from '@raycast/api'
  import { TrelloResultModel } from './trelloResponse.model'
  
  interface TodoListItemProps {
    result: TrelloResultModel
  }
  
  export const TodoListItem = ({
    result,
  }: TodoListItemProps): JSX.Element => {
    const todo = result
  
    return (
      <List.Item
        id={todo.id}
        title={todo.name}
        // accessoryTitle={todo.due?.toLocaleDateString()}
        subtitle={todo.desc}
        icon={Icon.Checkmark}
        // TODO: How to do the following?
        // keywords={todo.labels.name}
        actions={
        <ActionPanel>
            <ActionPanel.Section title="Links">
            <OpenInBrowserAction
              url={todo.url}
              title="Open on Trello"
              icon={Icon.Link}
            />
        </ActionPanel.Section>
        </ActionPanel>
        }
      />
    )
  }