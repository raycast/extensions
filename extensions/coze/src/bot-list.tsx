import { Detail, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import useAPI, { PagedData } from "./net/api";
import { SimpleBot, WorkSpace } from "@coze/api";
import WorkspaceListView from "./views/WorkspaceListView";
import BotListView from "./views/BotListView";
import BotChat from "./views/BotChatView";


export default function CommandBotList() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [workspaces, setWorkspaces] = useState<PagedData<WorkSpace>>({
    items: [],
    has_more: false,
  });
  const api = useRef<Awaited<ReturnType<typeof useAPI>>>();

  const onWorkspaceSelect = async (workspace: WorkSpace) => {
    const pagedBots = await api.current?.listBots({ space_id: workspace.id });
    push(<BotListView
      pagedBots={pagedBots}
      onSelect={async (bot: SimpleBot) => {
        console.log(`select bot: ${bot.bot_id} ${bot.bot_name}`);

        push(<BotChat api={api?.current}/>);
      }}
    />);
  }

  useEffect(() => {
    (async () => {
      api.current = await useAPI();
      setInitialized(true);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!initialized) return;
      setIsLoading(true);
      try {
        const workspacePaged = await api.current?.listWorkspaces({});
        workspacePaged && setWorkspaces(workspacePaged);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, [initialized]);


  if (isLoading) {
    return <Detail isLoading={isLoading}/>;
  }

  return (
    <WorkspaceListView
      workspaces={workspaces}
      onSelect={onWorkspaceSelect}
    />
  );
}
