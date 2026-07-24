import { parseDateAcrossLocales } from "./parseDateAcrossLocales";
import { removeWhiteSpacesFromQuotedWords } from "./removeWhiteSpacesFromQuotedWords";

const REMINDER_PREFIX_REGEXES = [
  /^remind me to\s*/i,
  /^remind me\s*/i,
  /^erinnere mich daran,?\s*/i,
  /^erinnere mich\s*/i,
  /^rappelle-?\s?moi de\s*/i,
  /^rappelle-?\s?moi\s*/i,
  /^recu[ée]rdame que\s*/i,
  /^recu[ée]rdame\s*/i,
  /^herinner me eraan om\s*/i,
  /^herinner me\s*/i,
  /^lembr[ae]-?me de\s*/i,
  /^lembr[ae]-?me\s*/i,
  /^напомни мне\s*/i,
  /^напоминай мне\s*/i,
  /^提醒我\s*/,
  /^思い出させて\s*/,
];

export function extractTopicAndDateFromInputText(inputText: string) {
  const parsedDate = parseDateAcrossLocales(inputText, new Date());

  const textWithoutDatePhrase = parsedDate
    ? inputText.slice(0, parsedDate.index) + inputText.slice(parsedDate.index + parsedDate.matchedText.length)
    : inputText;

  let topic = textWithoutDatePhrase;
  for (const prefixRegex of REMINDER_PREFIX_REGEXES) {
    topic = topic.replace(prefixRegex, "");
  }
  topic = removeWhiteSpacesFromQuotedWords(topic.replace(/\s{2,}/g, " ").trim());

  return {
    date: parsedDate?.date as Date,
    topic,
  };
}
