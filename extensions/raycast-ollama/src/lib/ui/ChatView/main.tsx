import * as React from "react";
import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  DeleteSettingsCommandChatByIndex,
  GetSettingsCommandChatNames,
  SetSettingsCommandChatByIndex,
} from "../../settings/settings";
import { RaycastChat, RaycastChatMessage } from "../../settings/types";
import { ChangeChat, ClipboardConversation, NewChat, Run } from "./function";
import { FormModel } from "./form/Model";
import { FormRenameChat } from "./form/RenameChat";
import { GetImage } from "../function";
import { RaycastImage } from "../../types";
import { Document } from "langchain/document";
import { FormAttachFile } from "./form/AttachFile";

/**
 * Return JSX element for chat view.
 * @returns {JSX.Element} Raycast Chat View.
 */
export function ChatView(): JSX.Element {
  const {
    data: ChatNames,
    revalidate: RevalidateChatNames,
    isLoading: IsLoadingChatNames,
  } = usePromise(GetSettingsCommandChatNames, [], {
    onError: () => setShowFormModel(true),
  });
  const [ChatNameIndex, SetChatNameIndex]: [number, React.Dispatch<React.SetStateAction<number>>] = React.useState(0);
  const [Chat, SetChat]: [RaycastChat | undefined, React.Dispatch<React.SetStateAction<RaycastChat | undefined>>] =
    React.useState();
  const [ChatIndex, SetChatIndex]: [number, React.Dispatch<React.SetStateAction<number>>] = React.useState(0);
  const [ChatModelsAvailable, SetChatModelsAvailable]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);
  const [IsLoading, SetIsLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [Query, SetQuery]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [ShowAnswerMetadata, SetShowAnswerMetadata] = React.useState(false);

  const [Image, SetImage]: [
    RaycastImage[] | undefined,
    React.Dispatch<React.SetStateAction<RaycastImage[] | undefined>>
  ] = React.useState();
  const [Document, SetDocument]: [
    Document<Record<string, any>>[] | undefined,
    React.Dispatch<React.SetStateAction<Document<Record<string, any>>[] | undefined>>
  ] = React.useState();

  // Save Chat To LocalStoarge on Inference Done.
  React.useEffect(() => {
    if (!IsLoading && Chat && Chat.messages.length > 0 && Chat.messages[Chat.messages.length - 1].done) {
      SetQuery("");
      SetIsLoading(false);
      if (Image) SetImage(undefined);
      if (Document) SetDocument(undefined);
      if (Chat.messages.length === 1 && Chat.name === "New Chat")
        SetChat((prevValue) => {
          if (prevValue) {
            const name = `${prevValue.messages[0].messages[0].content.substring(0, 25)}...`;
            if (ChatNames) ChatNames[ChatNameIndex] = name;
            return { ...prevValue, name: name };
          }
        });
      SetSettingsCommandChatByIndex(ChatNameIndex, Chat);
    }
  }, [Chat, IsLoading]);

  // Change Chat on new ChatNames or new ChatNameIndex
  React.useEffect(() => {
    if (!ChatNames) return;
    if (ChatNameIndex > ChatNames.length - 1) {
      SetChatNameIndex(ChatNames.length - 1);
      return;
    }
    ChangeChat(ChatNameIndex, SetChat, SetChatModelsAvailable, setShowFormModel);
  }, [ChatNames, ChatNameIndex]);

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
  // Form: AttachDocument
  const [showFormAttachFile, setShowFormAttachFile]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);

  /**
   * Action Panel for  Message
   * @param props - Selected Chat Message
   * @returns Action Panel
   */
  function ActionMessage(props: { message?: RaycastChatMessage }): JSX.Element {
    return (
      <ActionPanel>
        {!IsLoading && Query && Chat && ChatModelsAvailable && (
          <Action
            title="Get Answer"
            icon={Icon.SpeechBubbleActive}
            onAction={() => {
              Run(Query, Image, Document, Chat, SetChat, SetIsLoading).catch(async (e: Error) => {
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
          {props.message && (
            <Action.CopyToClipboard
              title="Copy Question"
              content={props.message.messages[0].content as string}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          )}
          {props.message && (
            <Action.CopyToClipboard
              title="Copy Answer"
              content={props.message.messages[1].content as string}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
          {props.message && <Action.CopyToClipboard title="Copy Conversation" content={ClipboardConversation(Chat)} />}
          {Chat && (
            <Action
              title="New Chat"
              icon={Icon.NewDocument}
              onAction={() => NewChat(Chat, SetChatNameIndex, RevalidateChatNames)}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          )}
          {Chat && (
            <Action
              title="Rename Chat"
              icon={Icon.Pencil}
              onAction={() => setShowFormRenameChat(true)}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
          )}
          {Chat && (
            <ActionPanel.Submenu title="Delete Chat" icon={Icon.Trash}>
              <Action
                title={`Yes, Delete "${Chat.name}" Chat`}
                icon={Icon.Trash}
                onAction={() => {
                  DeleteSettingsCommandChatByIndex(ChatNameIndex).then(() => {
                    RevalidateChatNames();
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
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
            <Action
              title="Browser Extention Tab"
              icon={Icon.Globe}
              onAction={() => SetQuery((prevState) => (prevState += "\n{browser-tab}\n"))}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
            <Action
              title="Image From Clipboard"
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
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
            <Action
              title="File"
              icon={Icon.Finder}
              onAction={() => setShowFormAttachFile(true)}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          </ActionPanel.Section>
        )}
        <ActionPanel.Section title="Settings">
          {Chat && (
            <Action
              title="Change Model"
              icon={Icon.Box}
              onAction={() => setShowFormModel(true)}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
          )}
          {props.message && (
            <Action
              title={ShowAnswerMetadata ? "Hide Metadata" : "Show Metadata"}
              icon={ShowAnswerMetadata ? Icon.EyeDisabled : Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "y" }}
              onAction={() => SetShowAnswerMetadata((prevState) => !prevState)}
            />
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  /**
   * Raycast Detail Metadata for Ollama Message
   * @param props - Chat Message
   * @returns JSX Element
   */
  function DetailMetadataMessage(props: { message: RaycastChatMessage }): JSX.Element {
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

  if (showFormAttachFile)
    return <FormAttachFile SetDocument={SetDocument} SetShow={setShowFormAttachFile} Document={Document} />;

  return (
    <List
      isLoading={IsLoading || IsLoadingChatNames}
      searchBarPlaceholder="Ask..."
      searchText={Query}
      selectedItemId={String(ChatIndex)}
      onSearchTextChange={(t) => {
        if (!IsLoading) SetQuery(t);
      }}
      actions={!IsLoadingChatNames && <ActionMessage />}
      isShowingDetail={Chat && Chat.messages.length > 0}
      searchBarAccessory={
        !IsLoadingChatNames && ChatNames && !IsLoading ? (
          <List.Dropdown
            tooltip="Chat History"
            value={String(ChatNameIndex)}
            onChange={(v) => SetChatNameIndex(Number(v))}
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
            actions={<ActionMessage message={item} />}
            detail={
              <List.Item.Detail
                markdown={`${item.images ? `${item.images.map((i) => i.html)}\n` : ""}${item.messages[1].content}`}
                metadata={item.done && ShowAnswerMetadata && <DetailMetadataMessage message={item} />}
              />
            }
          />
        ))
      ) : ChatModelsAvailable ? (
        <List.EmptyView icon={Icon.Message} title="Start a Conversation with Ollama" />
      ) : (
        <List.EmptyView icon={Icon.Xmark} title="Ollama Server or Selected Model Unavailable." />
      )}
    </List>
  );
}
