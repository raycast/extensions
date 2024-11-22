import { SimpleBot, } from "@coze/api";
import { PagedData } from "../net/api";
import { Action, ActionPanel, List } from "@raycast/api";

const BotListView = (
  {
    pagedBots,
    onSelect,
  }: {
    pagedBots?: PagedData<SimpleBot>,
    onSelect: (bot: SimpleBot) => void,
  }) => {
  const bots = pagedBots?.items || [];

  return <List
    filtering={false}
  >
    {bots.length === 0 ? (
      <List.EmptyView
        icon={{ source: "coze.svg" }}
        title="No bots found"
        description="Please create a bot first"
      />
    ) : (
      bots.map((item: SimpleBot) => (
        <List.Item
          key={item.bot_id}
          title={item.bot_name}
          icon={{ source: item.icon_url }}
          subtitle={item.description}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => onSelect(item)}/>
            </ActionPanel>
          }
        />
      ))
    )}
  </List>
}

export default BotListView;
