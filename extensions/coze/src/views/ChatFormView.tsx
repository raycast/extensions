import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { SimpleBot, WorkSpace } from "@coze/api";
import BotConversationView from "./BotConversationView";
import useWorkspaces from "../hooks/useWorkspaces";
import useBots from "../hooks/useBots";
import ErrorView from "./ErrorView";
import { APIInstance } from "../services/api";
import useCreateConversation from "../hooks/useCreateConversation";
import { History } from "../hooks/useHistory";

export default function ChatFormView({
  isLoading: isDefaultLoading,
  api,
  workspaceId: defaultWorkspaceId,
  botId: defaultBotId,
  query: defaultQuery,
  autoFocusQuery,
}: {
  isLoading: boolean;
  api?: APIInstance;
  workspaceId?: string;
  botId?: string;
  query?: string;
  autoFocusQuery?: boolean;
}) {
  const { push } = useNavigation();
  const [query, setQuery] = useState<string>(defaultQuery || "");
  const [file, setFile] = useState<string[]>([]);
  const [queryFieldError, setQueryFieldError] = useState<string | undefined>();
  const [workspaceFieldError, setWorkspaceFieldError] = useState<string | undefined>();
  const [botFieldError, setBotFieldError] = useState<string | undefined>();
  const {
    workspaces,
    workspaceId,
    setWorkspaceId,
    workspaceError,
    isLoading: isWorkspacesLoading,
  } = useWorkspaces(api, defaultWorkspaceId);
  const { bots, botId, setBotId, botError, isLoading: isBotsLoading } = useBots(api, workspaceId, defaultBotId);
  const {
    createConversationError,
    createConversation,
    isLoading: isCreateConversationLoading,
  } = useCreateConversation(api);
  const isLoading = isDefaultLoading || isWorkspacesLoading || isBotsLoading || isCreateConversationLoading;

  const checkField = (title: string, setError: (val?: string) => void, val?: string) => {
    setError(val?.length === 0 ? `${title} should not be empty!` : undefined);
  };

  const onConversationCreate = async () => {
    api?.log(`onConversationCreate: ${workspaceId} ${botId} ${query} ${JSON.stringify(file)}`);
    if (query?.length == 0) {
      setQueryFieldError("Query should not be empty!");
      return;
    } else {
      setQueryFieldError(undefined);
    }

    // create new conversation
    const newConversation = await createConversation(workspaceId, botId);
    api?.log(`[ChatFormView] createConversation: ${JSON.stringify(newConversation)}`);
    if (!newConversation) {
      return;
    }

    // 创建新的 history
    const newHistory: History = {
      space_id: workspaceId,
      bot_id: botId,
      conversation_id: newConversation.id,
      message: query,
      created_at: Date.now(),
    };

    push(
      <BotConversationView
        isLoading={isDefaultLoading || isCreateConversationLoading}
        api={api}
        workspaceId={workspaceId}
        botId={botId}
        query={query}
        filePath={file?.length > 0 ? file[0] : undefined}
        newHistory={newHistory}
      />,
    );
  };

  if (workspaceError || botError || createConversationError) {
    return <ErrorView error={workspaceError || botError || createConversationError || ""} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={onConversationCreate} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="workspace_id"
        title="Workspace"
        placeholder="Select your workspace"
        isLoading={isWorkspacesLoading}
        error={workspaceFieldError}
        onChange={(val) => {
          setWorkspaceId(val);
          checkField("Workspace", setWorkspaceFieldError, val);
        }}
        onBlur={(event) => {
          checkField("Workspace", setWorkspaceFieldError, event?.target?.value);
        }}
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
        isLoading={isWorkspacesLoading || isBotsLoading}
        error={botFieldError}
        onChange={(val) => {
          setBotId(val);
          checkField("Bot", setBotFieldError, val);
        }}
        onBlur={(event) => {
          checkField("Bot", setBotFieldError, event?.target?.value);
        }}
      >
        {bots.map((bot: SimpleBot) => (
          <Form.Dropdown.Item key={bot.bot_id} value={bot.bot_id} title={bot.bot_name} icon={bot.icon_url} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="query"
        title="Query"
        placeholder="Enter your message"
        value={query}
        autoFocus={autoFocusQuery}
        error={queryFieldError}
        onChange={(val) => {
          setQuery(val);
          checkField("Query", setQueryFieldError, val);
        }}
        onBlur={(event) => {
          checkField("Query", setQueryFieldError, event?.target?.value);
        }}
      />
      <Form.FilePicker
        allowMultipleSelection={false}
        canChooseDirectories={false}
        id="file"
        title="File"
        value={file}
        onChange={(val) => setFile(val)}
      />
    </Form>
  );
}
