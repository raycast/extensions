import { QUOTE_GROUPS } from "../constants";
import { Quote } from "../types";
import { showToast, Toast } from "@raycast/api";

const applyPunctuation = (words: string[]): string[] => {
  return words.map((word) => {
    if (Math.random() > 0.3) {
      return word;
    }

    const punctuationMarks = [".", ",", "!", "?", ";", ":", '"', "'"];
    const mark =
      punctuationMarks[Math.floor(Math.random() * punctuationMarks.length)];

    let newWord = word.charAt(0).toUpperCase() + word.slice(1);

    if (mark === '"' || mark === "'") {
      newWord = `${mark}${newWord}${mark}`;
    } else {
      newWord = `${newWord}${mark}`;
    }

    return newWord;
  });
};

const applyNumbers = (words: string[], percentage: number): string[] => {
  const numCount = Math.floor(words.length * (percentage / 100));
  const wordsCopy = [...words];

  for (let i = 0; i < numCount; i++) {
    const randomIndex = Math.floor(Math.random() * wordsCopy.length);
    wordsCopy[randomIndex] = Math.floor(Math.random() * 1000).toString();
  }

  return wordsCopy;
};

export const getWords = (
  rawData: string[],
  limit: number,
  mode: "words" | "time",
  useNumbers: boolean,
  usePunctuation: boolean,
): string[] => {
  const wordPool = [...rawData];
  const needed = mode === "words" ? limit : 500;

  let generated = Array.from(
    { length: needed },
    () => wordPool[Math.floor(Math.random() * wordPool.length)],
  );

  if (useNumbers) {
    generated = applyNumbers(generated, 20);
  }

  if (usePunctuation) {
    generated = applyPunctuation(generated);
  }

  return generated;
};

export const getQuote = (
  rawQuotes: Quote[],
  limit: number,
): { words: string[]; source: string } => {
  const group = QUOTE_GROUPS.find((g) => g.id === limit) || QUOTE_GROUPS[1];

  const validQuotes = rawQuotes.filter(
    (q) => q.length >= group.min && q.length <= group.max,
  );

  if (validQuotes.length > 0) {
    const randomQuote =
      validQuotes[Math.floor(Math.random() * validQuotes.length)];
    return {
      words: randomQuote.text.split(" "),
      source: `${randomQuote.source} (ID: ${randomQuote.id})`,
    };
  }

  const anyQuote = rawQuotes[Math.floor(Math.random() * rawQuotes.length)];

  if (anyQuote) {
    showToast(
      Toast.Style.Failure,
      "No quotes found",
      "Using a random fallback quote.",
    );

    return {
      words: anyQuote.text.split(" "),
      source: `${anyQuote.source} (ID: ${anyQuote.id}) [Random Fallback]`,
    };
  }

  showToast(
    Toast.Style.Failure,
    "No quotes available",
    "Please check your typing data settings.",
  );

  return {
    words: [],
    source: "",
  };
};
