import { Action, ActionPanel, Form } from "@raycast/api";
import { useEffect, useState } from "react";
import useAPI from "../net/api";
import { SimpleBot, StreamChatData, WorkSpace } from "@coze/api";

export default function ChatForm(
  {
    isLoading,
    api
  }: {
    isLoading: boolean,
    api?: Awaited<ReturnType<typeof useAPI>>
  }) {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [botId, setBotId] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [workspaces, setWorkspaces] = useState<WorkSpace[]>([]);
  const [bots, setBots] = useState<SimpleBot[]>([]);

  const [nameError, setNameError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();


  useEffect(() => {
    (async () => {
      if (!api) return;
      const data = await api.listAllWorkspaces();
      data && setWorkspaces(data.items);
      data && data.items.length > 0 && setWorkspaceId(data.items[0].id);
    })();
  }, [api]);

  useEffect(() => {
    (async () => {
      if (!api || !workspaceId) return;
      const data = await api.listAllBots({
        space_id: workspaceId,
      });
      data && setBots(data.items);
      data && data.items.length > 0 && setBotId(data.items[0].bot_id);
    })();
  }, [workspaceId]);


  const handleSubmit = async () => {
    const params = {
      workspace_id: workspaceId,
      bot_id: botId,
      query: query,
    }
    console.log(`[chat_form] handleSubmit: ${JSON.stringify(params)}`);
    await api?.streamChat({
      workspace_id: workspaceId,
      bot_id: botId,
      user_id: "raycast_user",
      query,
      on_event: (event: StreamChatData) => {
        console.log(`[chat_form] on_event: ${JSON.stringify(event)}`);
      }
    })
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit}/>
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="workspace_id"
        title="Workspace"
        placeholder="Select your workspace"
        onChange={setWorkspaceId}
      >
        {workspaces.map((workspace: WorkSpace) => (
          <Form.Dropdown.Item
            key={workspace.id}
            value={workspace.id}
            title={workspace.name}
            icon={workspace.icon_url}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="bot_id"
        title="Bot"
        placeholder="Select your bot"
        onChange={setBotId}
      >
        {bots.map((bot: SimpleBot) => (
          <Form.Dropdown.Item
            key={bot.bot_id}
            value={bot.bot_id}
            title={bot.bot_name}
            icon={bot.icon_url}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="query"
        title="Query"
        placeholder="Enter your message"
        onChange={setQuery}
      />
    </Form>
  );
}
