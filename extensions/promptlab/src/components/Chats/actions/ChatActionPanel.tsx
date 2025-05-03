import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { ExportChatAction } from "./ExportChatAction";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import ChatSettingsForm from "../ChatSettingsForm";
import { CopyChatActionsSection } from "./CopyChatActions";
import { anyActionsEnabled, getActionShortcut, isActionEnabled } from "../../../lib/actions";
import { AdvancedActionSubmenu } from "../../actions/AdvancedActionSubmenu";
import ContextSettingsActionSection from "./ContextSettingsActionSection";
import { Chat, ChatManager } from "../../../lib/chats/types";
import ToggleFavoriteAction from "../../actions/ToggleFavoriteAction";
import DeleteAction from "../../actions/DeleteAction";
import DeleteAllAction from "../../actions/DeleteAllAction";

/**
 * Actions panel for the Chat command.
 */
export const ChatActionPanel = (props: {
  isLoading: boolean;
  chat: Chat | undefined;
  chats: ChatManager;
  useFileContext: boolean;
  useConversationContext: boolean;
  useAutonomousFeatures: boolean;
  setCurrentChat: (value: React.SetStateAction<Chat | undefined>) => void;
  setSentQuery: React.Dispatch<React.SetStateAction<string>>;
  setUseFileContext: React.Dispatch<React.SetStateAction<boolean>>;
  setUseConversationContext: React.Dispatch<React.SetStateAction<boolean>>;
  setUseAutonomousFeatures: React.Dispatch<React.SetStateAction<boolean>>;
  response: string;
  previousResponse: string;
  query: string;
  basePrompt: string;
  onSubmit: (values: Form.Values) => void;
  onCancel: () => void;
  settings: typeof defaultAdvancedSettings;
  revalidate: () => void;
}) => {
  const {
    isLoading,
    settings,
    chat,
    chats,
    useFileContext,
    useConversationContext,
    useAutonomousFeatures,
    setCurrentChat,
    setSentQuery,
    setUseFileContext,
    setUseConversationContext,
    setUseAutonomousFeatures,
    response,
    previousResponse,
    query,
    basePrompt,
    onSubmit,
    onCancel,
    revalidate,
  } = props;

  return (
    <ActionPanel>
      {isLoading ? (
        <Action title="Cancel" onAction={onCancel} />
      ) : (
        <Action.SubmitForm title="Submit Query" onSubmit={onSubmit} />
      )}

      <ContextSettingsActionSection
        chat={chat}
        chats={chats}
        useFileContext={useFileContext}
        useConversationContext={useConversationContext}
        useAutonomousFeatures={useAutonomousFeatures}
        setUseFileContext={setUseFileContext}
        setUseConversationContext={setUseConversationContext}
        setUseAutonomousFeatures={setUseAutonomousFeatures}
      />

      {anyActionsEnabled(
        ["ChatSettingsAction", "ToggleFavoriteAction", "ExportChatAction", "DeleteAction", "DeleteAllAction"],
        settings,
      ) ? (
        <ActionPanel.Section title="Chat Actions">
          {chat && isActionEnabled("ChatSettingsAction", settings) ? (
            <Action.Push
              title="Edit Chat Settings..."
              icon={Icon.Gear}
              target={
                <ChatSettingsForm oldData={chat} chats={chats} setCurrentChat={setCurrentChat} settings={settings} />
              }
              shortcut={getActionShortcut("ChatSettingsAction", settings)}
            />
          ) : null}

          {chat ? (
            <ToggleFavoriteAction object={chat} settings={settings} revalidateObjects={chats.revalidate} />
          ) : null}

          {chat && isActionEnabled("ExportChatAction", settings) ? (
            <ExportChatAction chat={chat} chats={chats} settings={settings} />
          ) : null}

          {chat ? <DeleteAction object={chat} settings={settings} revalidateObjects={chats.revalidate} /> : null}
          <DeleteAllAction objects={chats.chats} settings={settings} revalidateObjects={chats.revalidate} />
        </ActionPanel.Section>
      ) : null}

      {isActionEnabled("RegenerateChatAction", settings) ? (
        <Action
          title="Regenerate"
          icon={Icon.ArrowClockwise}
          onAction={previousResponse?.length ? () => setSentQuery(query + " ") : revalidate}
          shortcut={getActionShortcut("RegenerateChatAction", settings)}
        />
      ) : null}

      <CopyChatActionsSection response={response} query={query} basePrompt={basePrompt} settings={settings} />

      <AdvancedActionSubmenu settings={settings} />
    </ActionPanel>
  );
};
