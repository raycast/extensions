import { getPreferenceValues } from "@raycast/api";
import { randomUUID } from "crypto";
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from "openai";
import { Stream } from "stream";

let openai: OpenAIApi | undefined;
function getOpenAIApi() {
  if (!openai) {
    const preferences = getPreferenceValues();
    if (!preferences.apiKey) {
      throw new Error("No API key found in preferences.");
    }

    const configuration = new Configuration({
      apiKey: preferences.apiKey,
    });

    openai = new OpenAIApi(configuration);
  }

  return openai;
}

export interface Message {
  id: string;
  role: ChatCompletionRequestMessageRoleEnum;
  content: string;
}

export async function ask(messages: ChatCompletionRequestMessage[], onNewChunk: (message: Message) => void) {
  const openai = getOpenAIApi();

  const completion = await openai.createChatCompletion(
    {
      model: "gpt-3.5-turbo",
      messages,
      stream: true,
    },
    { responseType: "stream" }
  );

  let message: Message = { role: "assistant", id: randomUUID(), content: "" };

  (completion.data as unknown as Stream).on("data", (data) => {
    const lines = data
      .toString()
      .split("\n")
      .filter((line: string) => line.trim() !== "");
    for (const line of lines) {
      const _message = line.replace("data: ", "");
      if (_message === "[DONE]") {
        return;
      }
      const parsed = JSON.parse(_message);
      const delta = parsed.choices[0].delta;
      if (delta.content) {
        message.content += delta.content;
      }
      onNewChunk(message);
    }
  });
}
