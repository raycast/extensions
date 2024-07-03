import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { TalkType } from "../../type/talk";

export const Respond = (
  prompt: string,
  question: string,
  conversation: TalkType[],
  loadConverasationsHistory: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  const messages = [new AIMessage(prompt)];

  if (loadConverasationsHistory && conversation.length) {
    conversation.forEach(({ question, result }) => {
      messages.push(new HumanMessage(question.text));
      if (result) {
        messages.push(new AIMessage(result.text));
      }
    });
  }

  messages.push(new HumanMessage(question));

  return {
    messages,
  };
};
