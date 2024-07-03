import { AssistantDefaultTemperature } from "../../type/assistant";
import { SnippetDefaultTemperature } from "../../type/snippet";
import { TalkType } from "../../type/talk";
import { ReplacePlaceholders } from "../../common/prompt";
import { Toast } from "@raycast/api";
import { ConversationSelectedTypeSnippet } from "../../type/conversation";
import { Call } from "../../ai/llm";
import { Respond } from "../../ai/logic/thinking";

export async function RunLangChain(
  chat: TalkType,
  conversations: TalkType[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interaction: { toast: Toast; setData: any; setStreamData: any; setLoading: any }
): Promise<TalkType | undefined> {
  const useStream = true;

  let promptString = chat.assistant.promptSystem;
  let temperature = chat.assistant.modelTemperature ? chat.assistant.modelTemperature : AssistantDefaultTemperature;
  let model = chat.assistant.model;
  const loadHistory = true;
  if (chat.snippet?.promptSystem && chat.conversationType === ConversationSelectedTypeSnippet) {
    promptString = chat.snippet.promptSystem;
    temperature = chat.snippet.modelTemperature ? chat.snippet.modelTemperature : SnippetDefaultTemperature;
    model = chat.snippet.model;
  }
  promptString = ReplacePlaceholders(chat, promptString);
  model = model.split("__")[1];

  return await Call(
    chat,
    Respond(promptString, chat.question.text, conversations.reverse(), loadHistory).messages,
    { stream: useStream, temperature, model },
    interaction
  );
}
