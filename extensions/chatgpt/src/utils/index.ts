import { Chat, ConfigurationPreferences, Message } from "../type";

function countOpenAITokens(text: string): number {
  // 100 tokens ~= 75 words
  const words = text.split(" ").length;
  const openAITokens = Math.ceil(words / 75) * 100;
  return openAITokens;
}

function limitConversationLength(chats: Chat[]) {
  // https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them
  const maxTokens = 3750;
  const newChats: Chat[] = [];
  let tokens = 0;

  for (const chat of chats) {
    const questionTokens = countOpenAITokens(chat.question);
    const answerTokens = countOpenAITokens(chat.answer);

    tokens = tokens + questionTokens + answerTokens;

    if (tokens > maxTokens) {
      break;
    }

    newChats.push(chat);
  }

  return newChats;
}

export function chatTransfomer(chat: Chat[], prompt: string): Message[] {
  const messages: Message[] = [{ role: "system", content: prompt }];
  const limitedChat = limitConversationLength(chat);
  limitedChat.forEach(({ question, answer }) => {
    messages.push({ role: "user", content: question });
    messages.push({
      role: "assistant",
      content: answer,
    });
  });
  return messages;
}

export const getConfigUrl = (params: ConfigurationPreferences) => {
  if (params.useAzure) return params.azureEndpoint + "/openai/deployments/" + params.azureDeployment;
  if (params.useApiEndpoint) return params.apiEndpoint;
  return "https://api.openai.com/v1";
};
