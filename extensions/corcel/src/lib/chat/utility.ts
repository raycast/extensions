import { randomUUID } from "crypto";

import { Chat, Exchange, Model } from "./types";
import { getPreferenceValues } from "@raycast/api";

export const generateExchangeFromQuestion = (question: string): Exchange => {
  return {
    id: randomUUID(),
    question: {
      content: question,
      created_on: new Date().toISOString(),
    },
    created_on: new Date().toISOString(),
  };
};

export const generateChatFromQuestion = (question: string): Chat => {
  const exchange = generateExchangeFromQuestion(question);
  return {
    exchanges: [exchange],
    created_on: new Date().toISOString(),
    id: randomUUID(),
    model: getPreferenceValues<Preferences>().chatModel,
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
