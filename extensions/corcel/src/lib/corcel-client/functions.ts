import { Exchange } from "../chat";

type OutboundMessage = { role: "assistant" | "user"; content: string };

export const convertExchangesToOutboundMessages = (exchanges: Exchange[]): OutboundMessage[] => {
  const returnData: OutboundMessage[] = [];
  const exchangesCopy = [...exchanges];
  let totalContextLength = 0;

  exchangesCopy.forEach((exchange) => {
    if (exchange.question.content.length + totalContextLength > 15000) {
      return;
    } else {
      totalContextLength += exchange.question.content.length;
      returnData.push({
        role: "user",
        content: exchange.question.content,
      });
      if (exchange.answer) {
        returnData.push({
          role: "assistant",
          content: exchange.answer.content,
        });
      }
    }
  });

  returnData.reverse();

  return returnData;
};
