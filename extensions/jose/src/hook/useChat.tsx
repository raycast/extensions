import { clearSearchBar, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { ChatHookType, GetNewChat } from "../type/chat";
import fetch from "node-fetch";
import {
  ConversationSelectedTypeAssistant,
  ConversationSelectedTypeSnippet,
  ConversationType,
} from "../type/conversation";
import {
  ConfigurationTypeCommunicationBinaryFile,
  ConfigurationTypeCommunicationExternalApi,
  ConfigurationTypeCommunicationLangChain,
} from "../type/config";
import { RunCustomApi } from "./chat/api";
import { RunBinnary } from "./chat/binary";
import { TalkQuestionFileType, TalkQuestionType, TalkType } from "../type/talk";
import { RunLangChain } from "./chat/langChain";
import { useConversations } from "./useConversations";

export function useChat(): ChatHookType {
  const [data, setData] = useState<TalkType[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [streamData, setStreamData] = useState<TalkType | undefined>();
  const conversations = useConversations();

  async function ask(question: string, file: string[] | undefined, conversation: ConversationType) {
    clearSearchBar();

    setLoading(true);
    const toast = await showToast({
      title: "Getting your answer...",
      style: Toast.Style.Animated,
    });

    const chatQuestion: TalkQuestionType = { text: question, files: undefined };
    if (file) {
      const f: TalkQuestionFileType = { type: "image", path: file[0], base64: undefined, url: undefined };
      chatQuestion.files = [f];
    }
    const chat: TalkType = GetNewChat(chatQuestion, conversation, conversation.assistant, conversation.snippet);
    chat.conversationType = conversation.selectedType;

    setData(() => {
      return [...conversation.chats, chat];
    });

    setTimeout(async () => {
      setSelectedChatId(chat.chatId);
    }, 50);

    console.log("SelectedType: " + conversation.selectedType);
    const typeCommunication =
      conversation.selectedType === ConversationSelectedTypeSnippet
        ? conversation.snippet?.typeCommunication
        : conversation.assistant.typeCommunication;
    let chatResponse: TalkType | undefined = undefined;

    switch (typeCommunication) {
      case ConfigurationTypeCommunicationLangChain:
        console.log("Using local");
        chatResponse = await RunLangChain(chat, data, { toast, setData, setStreamData, setLoading });
        break;
      case ConfigurationTypeCommunicationExternalApi:
        console.log("Using custom API endpoint");
        chatResponse = await RunCustomApi(chat, { toast, setData, setStreamData, setLoading });
        break;
      case ConfigurationTypeCommunicationBinaryFile:
        console.log("Using local binnary file");
        chatResponse = await RunBinnary(chat, { toast, setData, setStreamData, setLoading });
        break;
      default:
        console.log("Using default");
        chatResponse = await RunLangChain(chat, data, { toast, setData, setStreamData, setLoading });
    }

    if (chatResponse !== undefined) {
      console.log("Send webhook?");
      sendWebhook(chatResponse, setData);
    }

    if (chatResponse !== undefined) {
      console.log("Reset selected");
      conversation.selectedType = ConversationSelectedTypeAssistant;
      await conversations.update(conversation);
    }
  }

  const clear = useCallback(async () => {
    setData([]);
  }, [setData]);

  return useMemo(
    () => ({ data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear, streamData }),
    [data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear, streamData]
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendWebhook(chat: TalkType, setData: any) {
  const webhook =
    chat.conversationType === ConversationSelectedTypeSnippet ? chat.snippet?.webhookUrl : chat.assistant.webhookUrl;
  const newChat: TalkType = JSON.parse(JSON.stringify(chat));
  // eslint-disable-next-line
  // @ts-ignore
  newChat.assistant = { assistantId: newChat.assistant.assistantId };

  if (webhook === "" || webhook === null || webhook === undefined) {
    return;
  }

  fetch(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(chat),
  })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then(async (res: any) => {
      const data = await res.json();
      Object.assign(chat, data);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setData((prev: any) => {
        return prev.map((a: TalkType) => {
          if (a.chatId === chat.chatId) {
            return chat;
          }
          return a;
        });
      });
    })
    .catch((error) => {
      console.log("Webhook error");
      console.log(error);
    });
}
