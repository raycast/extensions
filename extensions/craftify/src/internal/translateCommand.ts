import { textEditCommand } from "./textEditCommand";
import { nativeLanguage } from "./config";

/**
 * Translator: translates from the native language to the target language and back, depending on the input text.
 * @param targetLanguage target language (for example, "english")
 * @param nativeLangExample example in the native language
 * @param targetLangExample example in the target language
 */
export async function translateCommand({
  targetLanguage,
  nativeLangExample,
  targetLangExample,
}: {
  targetLanguage: string;
  nativeLangExample: string;
  targetLangExample: string;
}) {
  const prompt = `You will act as an EXPERT translator.

###INSTRUCTIONS###
FOLLOW these INSTRUCTIONS carefully for translating the text:
1. READ the provided text in the user's message.
2. Process the sentences one by one, according to the algorithm:
  - Determine the language of the sentence.
  - If the sentence is in ${nativeLanguage}, translate it into ${targetLanguage}.
  - If the sentence is NOT in ${nativeLanguage}, translate it into ${nativeLanguage}.
3. Return your answer as a JSON object with one field:
   - "result": the translated text

### EXAMPLES ###

User message in ${nativeLanguage}:
${nativeLangExample}
Your answer:
{"result": "${targetLangExample}"}
---
User message in other language:
${targetLangExample}
Your answer:
{"result": "${nativeLangExample}"}
`;

  return textEditCommand({
    prompt,
    options: { temperature: 0.0 },
    hudMessage: "Translating text...",
    successMessage: "Text translated and copied to clipboard",
    errorMessage: "Cannot translate text",
  });
}
