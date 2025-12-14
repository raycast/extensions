import axios from "axios";
import { AnkiConnectRequest, AnkiConnectResponse, AnkiNote } from "../types";

/**
 * Check if AnkiConnect is available
 * @param ankiConnectUrl - AnkiConnect server URL
 * @returns true if AnkiConnect is reachable
 */
export async function checkAnkiConnect(
  ankiConnectUrl: string,
): Promise<boolean> {
  try {
    const request: AnkiConnectRequest = {
      action: "version",
      version: 6,
    };

    const response = await axios.post<AnkiConnectResponse<number>>(
      ankiConnectUrl,
      request,
      {
        timeout: 5000,
      },
    );

    return response.data.error === null && response.data.result >= 6;
  } catch (error) {
    return false;
  }
}

/**
 * Add a Cloze deletion card to Anki
 * @param word - The word to be cloze-deleted
 * @param definition - AI-generated definition (part of speech + meaning)
 * @param context - The context sentence containing the word
 * @param deckName - Target deck name
 * @param noteType - Note type (should be "Cloze" for cloze deletion)
 * @param ankiConnectUrl - AnkiConnect server URL
 * @returns Note ID if successful
 */
export async function addAnkiCard(
  word: string,
  definition: string,
  context: string,
  deckName: string,
  noteType: string,
  ankiConnectUrl: string,
): Promise<number> {
  // Parse AI response - now expecting 4 lines:
  // Line 1: Corrected sentence
  // Line 2: Word forms
  // Line 3: Part of speech + meaning
  // Line 4: Sentence translation
  const lines = definition.split("\n").filter((line) => line.trim());

  const correctedSentence = lines[0] || context; // Use corrected sentence if available
  const wordForms = lines[1] || word; // Word forms (fallback to original word)
  const partOfSpeechAndMeaning = lines[2] || definition; // Part of speech + meaning
  const sentenceTranslation = lines[3] || ""; // Sentence translation

  // Create cloze deletion using the corrected sentence
  // Using case-insensitive search to find and replace the word
  const regex = new RegExp(`\\b${word}\\b`, "gi");
  let clozeText = correctedSentence.replace(
    regex,
    (match) => `{{c1::${match}}}`,
  );

  // If the word wasn't found (might be due to different form), wrap the first occurrence
  if (!clozeText.includes("{{c1::")) {
    clozeText = `{{c1::${word}}} - ${correctedSentence}`;
  }

  // Format: Sentence with cloze + sentence translation
  const textContent = `<div style="font-size: 18px; line-height: 1.6;">${clozeText}</div>
<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
<strong>句意：</strong>${sentenceTranslation}
</div>`;

  // Back Extra: word forms + part of speech + meaning
  const backExtraContent = `<div style="font-size: 16px; color: #2c3e50; line-height: 1.8;">
<div style="margin-bottom: 10px;">
<strong style="color: #3498db;">词形：</strong><span style="color: #555;">${wordForms}</span>
</div>
<div>
<strong>${partOfSpeechAndMeaning}</strong>
</div>
</div>`;

  const note: AnkiNote = {
    deckName,
    modelName: noteType,
    fields: {
      Text: textContent,
      "Back Extra": backExtraContent,
    },
    tags: ["words2anki"],
    options: {
      allowDuplicate: false,
    },
  };

  const request: AnkiConnectRequest = {
    action: "addNote",
    version: 6,
    params: {
      note,
    },
  };

  try {
    const response = await axios.post<AnkiConnectResponse<number>>(
      ankiConnectUrl,
      request,
      {
        timeout: 10000,
      },
    );

    if (response.data.error) {
      throw new Error(response.data.error);
    }

    return response.data.result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED") {
        throw new Error(
          "Cannot connect to Anki. Please make sure Anki is running with AnkiConnect installed.",
        );
      }
      if (error.response?.data?.error) {
        throw new Error(`AnkiConnect error: ${error.response.data.error}`);
      }
    }
    throw new Error(
      `Failed to add card to Anki: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
