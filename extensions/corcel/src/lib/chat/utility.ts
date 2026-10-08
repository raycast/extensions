import { randomUUID } from "crypto";

import { Chat, Exchange, Model } from "./types";

export const generateExchangeFromQuestion = (question: string, model: Model): Exchange => {
  return {
    id: randomUUID(),
    model,
    question: {
      content: question,
      created_on: new Date().toISOString(),
    },
    created_on: new Date().toISOString(),
  };
};

export const generateChatFromQuestion = (question: string, model: Model): Chat => {
  const exchange = generateExchangeFromQuestion(question, model);
  return {
    exchanges: [exchange],
    created_on: new Date().toISOString(),
    updated_on: new Date().toISOString(),
    id: randomUUID(),

    title: question,
  };
};

export const getModelUrl = (model: Model) => {
  switch (model) {
    case "cortext-ultra":
      return "/v1/text/cortext/chat";
    case "mixtral-8x7b":
      return "/v1/text/vision/chat";
  }
};

export const CHAT_MODEL_TO_NAME_MAP: Record<Model, string> = {
  ["cortext-ultra"]: "Cortext Ultra",
  ["mixtral-8x7b"]: "Mixtral",
} as const;

export const formatExchangeResponse = (exchange: Exchange, isStreaming: boolean, errorMessage?: string) => {
  const response = `
  > Question: ${exchange.question.content}

  ${
    isStreaming && !exchange.answer
      ? "Generating response..."
      : exchange.answer
        ? `**${CHAT_MODEL_TO_NAME_MAP[exchange.model]}**: ${exchange.answer.content}`
        : errorMessage
          ? `**Error**: ${errorMessage}`
          : "**Error Generating response**"
  }
  `;

  return response;
};
