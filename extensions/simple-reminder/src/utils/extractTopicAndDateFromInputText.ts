import natural from "natural";
import * as chrono from "chrono-node";

const tokenizer = new natural.WordTokenizer();
const EXCLUDED_TOKENS = ["remind", "me", "to", "on"];

export function extractTopicAndDateFromInputText(inputText: string) {
  const targetDate = chrono.parseDate(inputText, new Date(), {
    forwardDate: true,
  });
  const { text: timeText } = chrono.parse(inputText, new Date())[0];
  const dateTimeRelatedTokens = tokenizer.tokenize(timeText);
  const inputTextTokens = tokenizer.tokenize(inputText);
  const tokensToRemoveForTopic = [...dateTimeRelatedTokens, ...EXCLUDED_TOKENS];
  const extractedTopicTokens = inputTextTokens.filter((token) => !tokensToRemoveForTopic.includes(token));

  return {
    date: targetDate,
    topic: extractedTopicTokens.join(" "),
  };
}
