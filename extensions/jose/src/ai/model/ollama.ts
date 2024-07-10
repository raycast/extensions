import { GetApiOllama } from "../../type/config";
import { TalkType } from "../../type/talk";
import { Ollama, Message } from "ollama";
import fetch from "node-fetch";
import { Toast } from "@raycast/api";
import { BaseMessage } from "@langchain/core/messages";
// @ts-expect-error ignore
globalThis.fetch = fetch;

export const CallOllama = async (
  chat: TalkType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: BaseMessage[],
  config: { stream: boolean; temperature: string; model: string; modelCompany: string },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interaction: { toast: Toast; setData: any; setStreamData: any; setLoading: any }
): Promise<TalkType> => {
  const ollama = new Ollama({
    host: GetApiOllama().host,
  });
  const response = await ollama.chat({
    model: config.model,
    messages: ollamaMessage(messages),
  });

  if (chat.result === undefined) {
    chat.result = {
      text: response.message.content,
      imageExist: false,
      images: undefined,
      actionType: "",
      actionName: "",
      actionStatus: "",
    };
  }
  chat.result.text = response.message.content;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interaction.setData((prev: any) => {
    return prev.map((a: TalkType) => {
      if (a.chatId === chat.chatId) {
        return chat;
      }
      return a;
    });
  });

  setTimeout(async () => {
    interaction.setStreamData(undefined);
  }, 5);

  interaction.setLoading(false);

  interaction.toast.title = "Got your answer!";
  interaction.toast.style = Toast.Style.Success;

  return chat;
};

function ollamaMessage(messages: BaseMessage[]): Message[] {
  const newMessage: Message[] = [];

  //langchain = "system" | "human"  | "ai"        | "generic" |  "function" | "tool"
  //ollama    = "system" | "user"   | "assistant"
  messages.map(async (msg: BaseMessage) => {
    if (msg._getType() === "system") {
      newMessage.push({
        role: "system",
        content: msg.content.toString(),
      });
    } else if (msg._getType() === "human") {
      newMessage.push({
        role: "user",
        content: msg.content.toString(),
      });
    } else if (msg._getType() === "ai") {
      newMessage.push({
        role: "assistant",
        content: msg.content.toString(),
      });
    }
  });

  return newMessage;
}
