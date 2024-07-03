import { TalkType } from "./talk";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ChatTransfomer(chat: TalkType[], prompt: string, loadHistory: boolean): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [{ role: "system", content: prompt }];

  if (loadHistory) {
    limitConversationLength(chat).forEach(({ question, result }) => {
      messages.push({
        role: "user",
        content: question.text,
      });
      messages.push({
        role: "assistant",
        content: result?.text,
      });
    });
  }

  return messages;
}

function countOpenAITokens(text: string): number {
  // 100 tokens ~= 75 words
  const words = text.split(" ").length;
  const openAITokens = Math.ceil(words / 75) * 100;
  return openAITokens;
}

function limitConversationLength(chats: TalkType[]) {
  // https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them
  const maxTokens = 3750;
  const newChats: TalkType[] = [];
  let tokens = 0;

  for (const chat of chats) {
    const questionTokens = countOpenAITokens(chat.question.text);
    const answerTokens = countOpenAITokens(chat.result ? chat.result.text : "");

    tokens = tokens + questionTokens + answerTokens;

    if (tokens > maxTokens) {
      break;
    }

    newChats.push(chat);
  }

  return newChats;
}
