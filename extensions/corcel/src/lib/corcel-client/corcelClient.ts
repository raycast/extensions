import { corcelStreamRequest } from "../api";
import { Exchange, Model, getModelUrl } from "../chat";
import { convertExchangesToOutboundMessages } from "./functions";

export const corcelClient = {
  chat: {
    sendMessage: async (exchanges: Exchange[], model: Model) => {
      return corcelStreamRequest({
        url: getModelUrl(model),
        data: {
          model: model,
          messages: convertExchangesToOutboundMessages(exchanges),
          stream: true,
          top_p: 0.75,
          temperature: 0.5,
          max_tokens: 500,
        },
      });
    },
  },
};
