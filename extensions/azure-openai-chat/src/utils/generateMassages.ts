import { ChatCompletionRequestMessageRoleEnum } from "openai";
import { AppPreference, History } from "../hooks";
import { getPreferenceValues } from "@raycast/api";

interface GenerateMessagesOptions {
  contextMessageCount: number;
}

const preferences = getPreferenceValues<AppPreference>();

const SYSTEM_PROMPT = {
  role: "system",
  content: preferences.systemPrompt,
};

export function generateMessages(histories: History[], prompt: string, options?: GenerateMessagesOptions) {
  return [
    SYSTEM_PROMPT,
    ...histories
      .slice(0, options?.contextMessageCount ?? 4)
      .map((history) => [
        {
          role: ChatCompletionRequestMessageRoleEnum.User,
          content: history.prompt,
        },
        {
          role: ChatCompletionRequestMessageRoleEnum.Assistant,
          content: history.content,
        },
      ])
      .flat(),
    { role: ChatCompletionRequestMessageRoleEnum.User, content: prompt },
  ].filter((item) => item.content);
}
