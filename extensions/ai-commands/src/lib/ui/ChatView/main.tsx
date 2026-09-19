import * as React from "react";
import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import {
  DeleteSettingsCommandChatByIndex,
  GetSettingsCommandChatByIndex,
  GetSettingsCommandChatNames,
  SetSettingsCommandChatByIndex,
} from "../../settings/settings";
import { RaycastChat, RaycastChatMessage } from "../../settings/types";
import { ChangeChat, ClipboardConversation, NewChat, Run } from "./function";
import { Shortcut } from "../shortcut";
import { FormModel } from "./form/Model";
import { FormRenameChat } from "./form/RenameChat";
import { GetImage } from "../function";
import { RaycastImage } from "../../types";
import { MessageRole, ToolCall } from "../../inference/types";

interface ChatViewProps {
  initialQuery?: string;
}

/**
 * Return JSX element for chat view.
 * @param props - Optional initial query for Quick AI
 * @returns {React.JSX.Element} Raycast Chat View.
 */
export function ChatView(props: ChatViewProps = {}): React.JSX.Element {
  const {
    data: ChatNames,
    revalidate: RevalidateChatNames,
    isLoading: IsLoadingChatNames,
  } = usePromise(GetSettingsCommandChatNames, [], {
    onError: () => setShowFormModel(true),
  });

  // Start with a special index to prevent auto-loading when Quick AI is invoked
  const [ChatNameIndex, SetChatNameIndex] = React.useState(props.initialQuery ? -1 : 0);
  const [Chat, SetChat]: [RaycastChat | undefined, React.Dispatch<React.SetStateAction<RaycastChat | undefined>>] =
    React.useState();
  const [ChatIndex, SetChatIndex]: [number, React.Dispatch<React.SetStateAction<number>>] = React.useState(0);
  const [ChatModelsAvailable, SetChatModelsAvailable]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);
  const [IsLoading, SetIsLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [Query, SetQuery]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState(
    props.initialQuery || "",
  );
  const [ShowAnswerMetadata, SetShowAnswerMetadata] = React.useState(false);
  const [shouldAutoSubmit, setShouldAutoSubmit] = React.useState(!!props.initialQuery);
  const [hasCreatedNewChat, setHasCreatedNewChat] = React.useState(false);
  const savedChatRef = React.useRef<string | undefined>(undefined);
  const chatLoadVersion = React.useRef(0);

  const [Image, SetImage]: [
    RaycastImage[] | undefined,
    React.Dispatch<React.SetStateAction<RaycastImage[] | undefined>>,
  ] = React.useState();

  const [useWebSearch, setUseWebSearch] = useCachedState("chat-use-web-search", true);

  // Create new chat for Quick AI with initial query
  React.useEffect(() => {
    if (props.initialQuery && !hasCreatedNewChat && ChatNames && ChatNames.length > 0) {
      setHasCreatedNewChat(true);
      // Get the first chat to use its model configuration
      GetSettingsCommandChatByIndex(0).then((firstChat: RaycastChat | undefined) => {
        if (firstChat) {
          NewChat(firstChat, SetChatNameIndex, RevalidateChatNames);
        }
      });
    }
  }, [props.initialQuery, hasCreatedNewChat, ChatNames]);

  // Auto-submit initial query after new chat is created
  React.useEffect(() => {
    if (shouldAutoSubmit && props.initialQuery && Chat && ChatModelsAvailable && !IsLoading && hasCreatedNewChat) {
      setShouldAutoSubmit(false);
      Run(props.initialQuery, Image, useWebSearch, Chat, SetChat, SetIsLoading).catch(async (e: Error) => {
        await showToast({ style: Toast.Style.Failure, title: "Error:", message: e.message });
        SetIsLoading(false);
      });
    }
  }, [shouldAutoSubmit, Chat, ChatModelsAvailable, IsLoading, hasCreatedNewChat]);

  // Save Chat To LocalStoarge on Inference Done.
  React.useEffect(() => {
    if (!IsLoading && Chat && Chat.messages.length > 0 && Chat.messages[Chat.messages.length - 1].done) {
      const firstQuestion = Chat.messages[0]?.messages.find((message) => message.role === MessageRole.USER)?.content;
      const updatedChat =
        Chat.messages.length === 1 && Chat.name === "New Chat" && firstQuestion
          ? { ...Chat, name: `${firstQuestion.substring(0, 25)}...` }
          : Chat;

      // Rename first, then persist the renamed object on the next render.
      // Persisting every rendered completed chat revalidated the history list,
      // which loaded a new Chat object and started this effect again.
      if (updatedChat !== Chat) {
        SetChat(updatedChat);
        return;
      }

      const latestMessage = Chat.messages[Chat.messages.length - 1];
      const saveKey = `${ChatNameIndex}:${Chat.name}:${Chat.messages.length}:${latestMessage.created_at || ""}`;
      if (savedChatRef.current === saveKey) return;
      savedChatRef.current = saveKey;

      SetQuery("");
      if (Image) SetImage(undefined);
      void SetSettingsCommandChatByIndex(ChatNameIndex, Chat).then(RevalidateChatNames);
    }
  }, [Chat, IsLoading]);

  // Load only when the selected index changes, or when the history transitions
  // between different sizes. A name refresh must not reload the active chat.
  React.useEffect(() => {
    if (!ChatNames || ChatNameIndex === -1) return;
    if (ChatNameIndex > ChatNames.length - 1) {
      SetChatNameIndex(ChatNames.length - 1);
      return;
    }
    const loadVersion = ++chatLoadVersion.current;
    void ChangeChat(ChatNameIndex, SetChat, SetChatModelsAvailable, setShowFormModel, () => {
      return chatLoadVersion.current === loadVersion;
    });
  }, [ChatNameIndex, ChatNames?.length]);

  // Change Chat Index to the last one when Chat change.
  React.useEffect(() => {
    if (Chat && Chat.messages.length - 1 !== ChatIndex) {
      SetChatIndex(Chat.messages.length - 1);
    }
  }, [ChatIndex, Chat]);

  // Form: RenameChat
  const [showFormRanameChat, setShowFormRenameChat]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);
  // Form: Model
  const [showFormModel, setShowFormModel]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);

  /**
   * Action Panel for  Message
   * @param props - Selected Chat Message
   * @returns Action Panel
   */
  function ActionMessage(props: { message?: RaycastChatMessage }): React.JSX.Element {
    const question = props.message?.messages.find((v) => v.role === MessageRole.USER);
    const answer = props.message?.messages.find((v) => v.role === MessageRole.ASSISTANT);
    return (
      <ActionPanel>
        {!IsLoading && Query && Chat && ChatModelsAvailable && (
          <Action
            title="Get Answer"
            icon={Icon.SpeechBubbleActive}
            onAction={() => {
              Run(Query, Image, useWebSearch, Chat, SetChat, SetIsLoading).catch(async (e: Error) => {
                await showToast({ style: Toast.Style.Failure, title: "Error:", message: e.message });
                SetIsLoading(false);
              });
            }}
          />
        )}
        {!IsLoadingChatNames && !ChatModelsAvailable && (
          <Action
            title="Reload"
            icon={Icon.Repeat}
            onAction={async () => await ChangeChat(ChatNameIndex, SetChat, SetChatModelsAvailable, setShowFormModel)}
          />
        )}
        <ActionPanel.Section title="Chat">
          {answer && answer.content && <Action.Paste content={answer.content as string} />}
          {answer && answer.content && (
            <Action.CopyToClipboard title="Copy Answer" content={answer.content as string} shortcut={Shortcut.Copy} />
          )}
          {question && (
            <Action.CopyToClipboard
              title="Copy Question"
              content={question.content as string}
              shortcut={Shortcut.CopyName}
            />
          )}
          {props.message && <Action.CopyToClipboard title="Copy Conversation" content={ClipboardConversation(Chat)} />}
          {Chat && (
            <Action
              title="New Chat"
              icon={Icon.NewDocument}
              onAction={() => NewChat(Chat, SetChatNameIndex, RevalidateChatNames)}
              shortcut={Shortcut.New}
            />
          )}
          {Chat && (
            <Action
              title="Rename Chat"
              icon={Icon.Pencil}
              onAction={() => setShowFormRenameChat(true)}
              shortcut={Shortcut.Edit}
            />
          )}
          {!Chat && (
            <Action
              title="Configure Chat"
              icon={Icon.Box}
              onAction={() => setShowFormModel(true)}
              shortcut={Shortcut.ChangeModel}
            />
          )}
          {Chat && (
            <ActionPanel.Submenu title="Delete Chat" icon={Icon.Trash} shortcut={Shortcut.Remove}>
              <Action
                title={`Yes, Delete "${Chat.name}" Chat`}
                icon={Icon.Trash}
                onAction={() => {
                  DeleteSettingsCommandChatByIndex(ChatNameIndex).then(() => {
                    SetChat(undefined);
                    SetChatModelsAvailable(false);
                    savedChatRef.current = undefined;
                    void RevalidateChatNames();
                  });
                }}
              />
              <Action title="No" icon={Icon.XMarkCircle} />
            </ActionPanel.Submenu>
          )}
        </ActionPanel.Section>
        {Chat && !IsLoading && (
          <ActionPanel.Section title="Attach">
            <Action
              title="Selection"
              icon={Icon.QuoteBlock}
              onAction={() => SetQuery((prevState) => (prevState += "\n{selection}\n"))}
              shortcut={Shortcut.AttachText}
            />
            <Action
              title="Browser Extention Tab"
              icon={Icon.Globe}
              onAction={() => SetQuery((prevState) => (prevState += "\n{browser-tab}\n"))}
              shortcut={Shortcut.AttachBrowserTab}
            />
            <Action
              title="Image from Clipboard"
              icon={Icon.Image}
              onAction={async () =>
                GetImage()
                  .then((i) => {
                    SetImage(i);
                    showToast({ style: Toast.Style.Success, title: "Image Added" });
                  })
                  .catch((e) => {
                    showToast({ style: Toast.Style.Failure, title: "Error: ", message: String(e) });
                  })
              }
              shortcut={Shortcut.AttachImage}
            />
          </ActionPanel.Section>
        )}
        <ActionPanel.Section title="Tools">
          <Action
            title={useWebSearch ? "Disable Internet Search" : "Enable Internet Search"}
            icon={Icon.Globe}
            onAction={() => setUseWebSearch((enabled) => !enabled)}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Settings">
          {Chat && (
            <Action
              title="Change Model"
              icon={Icon.Box}
              onAction={() => setShowFormModel(true)}
              shortcut={Shortcut.ChangeModel}
            />
          )}
          {props.message && (
            <Action
              title={ShowAnswerMetadata ? "Hide Metadata" : "Show Metadata"}
              icon={ShowAnswerMetadata ? Icon.EyeDisabled : Icon.Eye}
              shortcut={Shortcut.ToggleQuickLook}
              onAction={() => SetShowAnswerMetadata((prevState) => !prevState)}
            />
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  /**
   * Raycast Markdown.
   */
  function MarkdownMessage(item: RaycastChatMessage): string {
    let markdown = "";
    for (const msg of item.messages) {
      if (msg.role === MessageRole.ASSISTANT && msg.reasoning)
        markdown += `<details><summary><b>💡 Thinking... (click to expand)</b></summary>\n\n${msg.reasoning}\n\n</details>\n\n`;
      if (msg.role === MessageRole.ASSISTANT && msg.content !== "") markdown += msg.content;
    }
    return markdown;
  }

  function AccessoryMessage(message: RaycastChatMessage): List.Item.Accessory[] {
    const accessory: List.Item.Accessory[] = [];

    const toolUsed = message.messages.filter((v) => v.role === MessageRole.TOOL);
    if (toolUsed.length)
      accessory.push({ icon: Icon.Hammer, tooltip: toolUsed.map((v) => `${v.toolName}`).join(", ") });

    return accessory;
  }
  /**
   * Raycast Detail Metadata for Ollama Message
   * @param props - Chat Message
   * @returns JSX Element
   */
  function DetailMetadataMessage(props: { message: RaycastChatMessage }): React.JSX.Element {
    const toolCalls: ToolCall[] = [];
    for (const value of props.message.messages.filter((v) => v.toolCalls)) {
      if (value.toolCalls)
        for (const tool of value.toolCalls) {
          toolCalls.push(tool);
        }
    }

    return (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Model" text={props.message.model} />
        <Detail.Metadata.Separator />
        {props.message.files && props.message.files.length > 0 && (
          <Detail.Metadata.TagList title="Sources">
            {props.message.files.map((source) => (
              <Detail.Metadata.TagList.Item text={source} />
            ))}
          </Detail.Metadata.TagList>
        )}
        {props.message.eval_count && props.message.eval_duration && (
          <Detail.Metadata.Label
            title="Generation Speed"
            text={`${(props.message.eval_count / (props.message.eval_duration / 1e9)).toFixed(2)} token/s`}
          />
        )}
        {props.message.total_duration && (
          <Detail.Metadata.Label
            title="Total Inference Duration"
            text={`${(props.message.total_duration / 1e9).toFixed(2)}s`}
          />
        )}
        {props.message.load_duration && (
          <Detail.Metadata.Label title="Load Duration" text={`${(props.message.load_duration / 1e9).toFixed(2)}s`} />
        )}
        {props.message.prompt_eval_count && (
          <Detail.Metadata.Label title="Prompt Eval Count" text={`${props.message.prompt_eval_count}`} />
        )}
        {props.message.prompt_eval_duration && (
          <Detail.Metadata.Label
            title="Prompt Eval Duration"
            text={`${(props.message.prompt_eval_duration / 1e9).toFixed(2)}s`}
          />
        )}
        {props.message.eval_count && <Detail.Metadata.Label title="Eval Count" text={`${props.message.eval_count}`} />}
        {props.message.eval_duration && (
          <Detail.Metadata.Label title="Eval Duration" text={`${(props.message.eval_duration / 1e9).toFixed(2)}s`} />
        )}
        {toolCalls.length > 0 && (
          <React.Fragment>
            <Detail.Metadata.Separator />
            {toolCalls.map((v) => (
              <Detail.Metadata.Label title={`Tool Call: ${v.name}`} text={JSON.stringify(v.arguments)} />
            ))}
          </React.Fragment>
        )}
      </Detail.Metadata>
    );
  }

  if (showFormModel)
    return (
      <FormModel
        SetChat={SetChat}
        SetChatModelsAvailable={SetChatModelsAvailable}
        SetShow={setShowFormModel}
        Chat={Chat}
        ChatNameIndex={ChatNameIndex}
        revalidate={RevalidateChatNames}
      />
    );

  if (showFormRanameChat && Chat)
    return (
      <FormRenameChat
        SetChat={SetChat}
        SetShow={setShowFormRenameChat}
        Chat={Chat}
        ChatNameIndex={ChatNameIndex}
        revalidate={RevalidateChatNames}
      />
    );

  return (
    <List
      isLoading={IsLoading || IsLoadingChatNames}
      searchBarPlaceholder="Ask..."
      searchText={Query}
      selectedItemId={String(ChatIndex)}
      onSearchTextChange={(t) => {
        if (!IsLoading) SetQuery(t);
      }}
      isShowingDetail={Chat && Chat.messages.length > 0}
      searchBarAccessory={
        !IsLoadingChatNames && ChatNames ? (
          <List.Dropdown
            tooltip="Chat History"
            value={String(ChatNameIndex)}
            onChange={(v) => {
              // A streamed response updates the active chat incrementally. Do
              // not let it write into a different chat while it is in flight.
              const nextIndex = Number(v);
              // Raycast can emit onChange again when the dropdown re-renders
              // after its labels refresh. That is not a chat switch.
              if (!IsLoading && nextIndex !== ChatNameIndex) {
                SetChat(undefined);
                SetChatModelsAvailable(false);
                SetChatNameIndex(nextIndex);
              }
            }}
          >
            {ChatNames.map((n, i) => (
              <List.Dropdown.Item key={i} title={n} value={String(i)} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {Chat && Chat.messages.length > 0 ? (
        Chat.messages.map((item, index) => (
          <List.Item
            icon={item.done ? Icon.SpeechBubble : Icon.SpeechBubbleActive}
            title={item.messages[0].content}
            key={index}
            id={index.toString()}
            accessories={AccessoryMessage(item)}
            actions={<ActionMessage message={item} />}
            detail={
              <List.Item.Detail
                markdown={`${item.images ? `${item.images.map((i) => i.html)}\n` : ""}${MarkdownMessage(item)}`}
                metadata={item.done && ShowAnswerMetadata && <DetailMetadataMessage message={item} />}
              />
            }
          />
        ))
      ) : ChatModelsAvailable ? (
        <List.EmptyView icon={Icon.Message} title="Start a Conversation with Ollama" actions={<ActionMessage />} />
      ) : (
        <List.EmptyView
          icon={Icon.Xmark}
          title="Ollama Server or Selected Model Unavailable."
          actions={<ActionMessage />}
        />
      )}
    </List>
  );
}
