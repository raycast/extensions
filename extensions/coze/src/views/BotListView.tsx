import { SimpleBot } from "@coze/api";
import { Action, ActionPanel, List } from "@raycast/api";
import useBots from "../hooks/useBots";
import ErrorView from "./ErrorView";
import EmptyData from "./EmptyData";
import { APIInstance } from "../services/api";

const BotListView = ({
  isLoading: isDefaultLoading,
  api,
  workspaceId,
  onSelect,
}: {
  isLoading: boolean;
  api?: APIInstance;
  workspaceId: string;
  onSelect: (workspaceId: string, bot: SimpleBot) => void;
}) => {
  const { isLoading: isBotLoading, bots, setBotId, botError } = useBots(api, workspaceId);
  const isLoading = isDefaultLoading || isBotLoading;

  if (botError) {
    return <ErrorView error={botError} />;
  }

  return (
    <List
      isLoading={isLoading}
      onSelectionChange={(id) => {
        api?.log(`[BotListView] bot changed: ${id}`);
        id && setBotId(id);
      }}
    >
      {bots.length === 0 && !isLoading ? (
        <EmptyData title="bot" />
      ) : (
        bots.map((item: SimpleBot) => (
          <List.Item
            id={item.bot_id}
            key={item.bot_id}
            title={item.bot_name}
            icon={{ source: item.icon_url }}
            subtitle={item.description}
            actions={
              <ActionPanel>
                <Action title="Select" onAction={() => onSelect(workspaceId, item)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
};

export default BotListView;
