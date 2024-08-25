import { clearSearchBar, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { ChatHookType, GetNewChat } from "../type/chat";
import fetch from "node-fetch";
import { ConversationType } from "../type/conversation";
import {
  ConfigurationTypeCommunicationBinaryFile,
  ConfigurationTypeCommunicationExternalApi,
  ConfigurationTypeCommunicationLocal,
} from "../type/config";
import { useConversations } from "./useConversations";
import {
  ConversationSelectedTypeAssistant,
  ConversationSelectedTypeSnippet,
  ITalk,
  ITalkLlm,
  ITalkQuestion,
  ITalkQuestionFile,
} from "../ai/type";
import { RunLocal } from "./chat/local";
import { RunBinnary } from "./chat/binary";
import { RunCustomApi } from "./chat/api";
import { useLlm } from "./useLlm";

export function useChat(): ChatHookType {
  const [data, setData] = useState<ITalk[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [streamData, setStreamData] = useState<ITalk | undefined>();
  const conversations = useConversations();
  const llms = useLlm();

  async function ask(question: string, file: string[] | undefined, conversation: ConversationType) {
    clearSearchBar();

    setLoading(true);
    const toast = await showToast({
      title: "Getting your answer...",
      style: Toast.Style.Animated,
    });

    try {
      const chatQuestion: ITalkQuestion = { content: question, files: undefined };
      if (file) {
        const f: ITalkQuestionFile = { type: "image", path: file[0], base64: undefined, url: undefined };
        chatQuestion.files = [f];
      }
      const chat: ITalk = GetNewChat(chatQuestion, conversation, conversation.assistant, conversation.snippet);
      chat.conversation.type = conversation.selectedType;

      setData(() => {
        return [...conversation.chats, chat];
      });

      setTimeout(async () => {
        setSelectedChatId(chat.id);
      }, 50);

      console.info("SelectedType: " + conversation.selectedType);
      const typeCommunication =
        conversation.selectedType === ConversationSelectedTypeSnippet
          ? conversation.snippet?.typeCommunication
          : conversation.assistant.typeCommunication;
      let chatResponse: ITalk | undefined = undefined;

      const llmObject = llms.data.filter((llm: ITalkLlm) => chat.assistant.object.model === llm.key);
      if (llmObject !== undefined) {
        chat.llm.object = llmObject[0];
      }

      switch (typeCommunication) {
        case ConfigurationTypeCommunicationLocal:
          console.info("Using local");
          chatResponse = await RunLocal(chat, { toast, setData, setStreamData, setLoading });
          break;
        case ConfigurationTypeCommunicationExternalApi:
          console.info("Using custom API endpoint");
          chatResponse = await RunCustomApi(chat, { toast, setData, setStreamData, setLoading });
          break;
        case ConfigurationTypeCommunicationBinaryFile:
          console.info("Using local binnary file");
          chatResponse = await RunBinnary(chat, { toast, setData, setStreamData, setLoading });
          break;
        default:
          console.info("Using default");
          chatResponse = await RunLocal(chat, { toast, setData, setStreamData, setLoading });
      }

      if (chatResponse !== undefined) {
        console.info("Send webhook?");
        sendWebhook(chatResponse, setData, chat.snippet?.object?.webhookUrl);
        sendWebhook(chatResponse, setData, chat.assistant.object.webhookUrl);
      }

      if (chatResponse !== undefined) {
        console.info("Reset selected");
        conversation.selectedType = ConversationSelectedTypeAssistant;
        await conversations.update(conversation);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.title = error.toString();
      toast.style = Toast.Style.Failure;
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
async function sendWebhook(chat: ITalk, setData: any, webhook: string | undefined) {
  const newChat: ITalk = JSON.parse(JSON.stringify(chat));
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
        return prev.map((a: ITalk) => {
          if (a.id === chat.id) {
            return chat;
          }
          return a;
        });
      });
    })
    .catch((error) => {
      console.info("Webhook error");
      console.error(error);
    });
}
