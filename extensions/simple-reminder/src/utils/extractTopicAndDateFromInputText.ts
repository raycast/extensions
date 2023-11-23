import natural from "natural";
import * as chrono from "chrono-node";

const tokenizer = new natural.WordPunctTokenizer();
const EXCLUDED_INITIAL_TOKENS_REGEX = /(remind me to|remind me)\s*/i;

export function extractTopicAndDateFromInputText(inputText: string) {
  const targetDate = chrono.parseDate(inputText, new Date(), {
    forwardDate: true,
  });
  const { text: timeText } = chrono.parse(inputText, new Date())[0];
  const dateTimeRelatedTokens = tokenizer.tokenize(timeText);
  const inputTextTokens = tokenizer.tokenize(inputText.replace(EXCLUDED_INITIAL_TOKENS_REGEX, ""));

  const tokensToRemoveForTopic = [...dateTimeRelatedTokens];
  const extractedTopicTokens = inputTextTokens.filter((token) => !tokensToRemoveForTopic.includes(token));

  return {
    date: targetDate,
    topic: extractedTopicTokens.join(" "),
  };
}
