import { useNavigation } from "@raycast/api";
import { SimpleBot, WorkSpace } from "@coze/api";
import WorkspaceListView from "./views/WorkspaceListView";
import BotListView from "./views/BotListView";
import ChatFormView from "./views/ChatFormView";
import useAPI from "./hooks/useAPI";

export default function CommandBotList() {
  const { push } = useNavigation();
  const { isLoading, api } = useAPI();

  const onBotSelect = async (workspaceId: string, bot: SimpleBot) => {
    api?.log(`onBotSelect: ${bot.bot_id}`);

    push(
      <ChatFormView
        isLoading={isLoading}
        api={api}
        workspaceId={workspaceId}
        botId={bot.bot_id}
        autoFocusQuery={true}
      />,
    );
  };

  const onWorkspaceSelect = async (workspace: WorkSpace) => {
    api?.log(`[BotList] workspace selected: ${workspace.id}`);

    push(<BotListView isLoading={isLoading} api={api} workspaceId={workspace.id} onSelect={onBotSelect} />);
  };

  return <WorkspaceListView isLoading={isLoading} api={api} onSelect={onWorkspaceSelect} />;
}
