import { LaunchProps } from "@raycast/api";
import { showHUD, Clipboard } from "@raycast/api";
import { safeNumberArg } from "./utils";
import { showFailureToast } from "@raycast/utils";

export default async function main(props: LaunchProps<{ arguments: { numberOfChars: string } }>) {
  try {
    const { numberOfChars } = props.arguments;
    const safeNumberOfChars = safeNumberArg(numberOfChars);
    const dummyText = generateEnglishDummyText(safeNumberOfChars);
    await Clipboard.copy(dummyText);
    await showHUD("Copied dummy text to clipboard");
  } catch (error) {
    showFailureToast(error, { title: "Failed to generate dummy text" });
  }
}

const generateEnglishDummyText = (numberOfChars: number): string => {
  // Common English words of different lengths
  const words = [
    // Short words (1-3 chars)
    "a",
    "an",
    "the",
    "to",
    "of",
    "in",
    "is",
    "it",
    "on",
    "at",
    "by",
    "as",
    "or",
    "and",
    "but",
    // Medium words (4-6 chars)
    "about",
    "after",
    "again",
    "along",
    "also",
    "asked",
    "away",
    "back",
    "been",
    "being",
    "below",
    "between",
    "beyond",
    "both",
    "color",
    "could",
    "design",
    "each",
    "early",
    "ever",
    "every",
    "field",
    "first",
    "found",
    "from",
    "great",
    "group",
    "have",
    "house",
    "idea",
    "image",
    "into",
    "know",
    "large",
    "later",
    "less",
    "light",
    "like",
    "line",
    "made",
    "make",
    "many",
    "might",
    "more",
    "most",
    "move",
    "much",
    "must",
    "name",
    "never",
    "next",
    "often",
    "only",
    "open",
    "over",
    "part",
    "place",
    "point",
    "power",
    "right",
    "same",
    "seen",
    "side",
    "since",
    "small",
    "some",
    "sound",
    "still",
    "study",
    "such",
    "take",
    "than",
    "that",
    "their",
    "them",
    "then",
    "there",
    "these",
    "they",
    "thing",
    "think",
    "this",
    "those",
    "three",
    "time",
    "under",
    "very",
    "water",
    "way",
    "well",
    "were",
    "what",
    "when",
    "where",
    "which",
    "while",
    "who",
    "will",
    "with",
    "work",
    "world",
    "would",
    "year",
    "your",
    // Longer words (7+ chars)
    "another",
    "because",
    "building",
    "business",
    "children",
    "community",
    "computer",
    "consider",
    "continue",
    "creative",
    "cultural",
    "different",
    "discover",
    "education",
    "everyone",
    "experience",
    "following",
    "government",
    "important",
    "including",
    "information",
    "knowledge",
    "learning",
    "material",
    "national",
    "necessary",
    "original",
    "personal",
    "possible",
    "practice",
    "question",
    "research",
    "resource",
    "something",
    "sometimes",
    "structure",
    "together",
    "understand",
  ];

  // Common punctuation and sentence structures
  const punctuation = [".", ".", ".", ".", "?", "!", ",", ";", ":"];
  const sentenceStarters = [
    "The",
    "A",
    "In",
    "When",
    "If",
    "Although",
    "While",
    "Since",
    "Because",
    "As",
    "After",
    "Before",
    "However",
    "Therefore",
    "Consequently",
    "Nevertheless",
    "Moreover",
    "Furthermore",
  ];

  let result = "";

  // Start with a capital letter
  let currentSentence = sentenceStarters[Math.floor(Math.random() * sentenceStarters.length)] + " ";
  let wordCount = 0;

  while (result.length < numberOfChars) {
    // Add a word
    const word = words[Math.floor(Math.random() * words.length)];
    currentSentence += word;
    wordCount++;

    // Determine if we should end the sentence
    const shouldEndSentence = (wordCount > 5 && Math.random() < 0.2) || wordCount > 15;

    if (shouldEndSentence) {
      // End the sentence with a period, question mark, or exclamation point
      const endPunctuation = punctuation[Math.floor(Math.random() * 3)]; // Only ., ?, !
      currentSentence += endPunctuation + " ";

      // Start a new sentence
      wordCount = 0;
      if (result.length + currentSentence.length <= numberOfChars) {
        result += currentSentence;
        currentSentence = sentenceStarters[Math.floor(Math.random() * sentenceStarters.length)] + " ";
      } else {
        // We can't fit the whole sentence, so trim and break
        const remainingChars = numberOfChars - result.length;
        result += currentSentence.substring(0, remainingChars);
        break;
      }
    } else {
      // Continue the sentence with a comma, semicolon, or a space
      const continueWithPunctuation = Math.random() < 0.15;
      if (continueWithPunctuation) {
        const midPunctuation = punctuation[3 + Math.floor(Math.random() * 3)]; // Only ,, ;, :
        currentSentence += midPunctuation + " ";
      } else {
        currentSentence += " ";
      }

      // Check if we can fit the whole sentence so far
      if (result.length + currentSentence.length > numberOfChars) {
        const remainingChars = numberOfChars - result.length;
        result += currentSentence.substring(0, remainingChars);
        break;
      }
    }
  }

  // Trim to exact character count
  return result.substring(0, numberOfChars);
};
