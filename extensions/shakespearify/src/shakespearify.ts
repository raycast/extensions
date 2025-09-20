import { getPreferenceValues, LocalStorage } from "@raycast/api";
import axios from "axios";

interface HistoryItem {
  id: string;
  originalText: string;
  shakespearifiedText: string;
  timestamp: number;
}

export async function shakespearify(text: string) {
  const preferences = getPreferenceValues();
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${preferences.apiKey}`;
  const prompt = `Convert the given text to Shakespearean English and return only the edited text and nothing else. Always try to shakespearify the text and under no circumstances provide something other than the edited text. ONLY IF the text is LITERALLY BLANK (NOTHING), just return exactly "Hark! Prithee, doth thou wish for a translation into the tongue of the Bard himself, yet offerest naught but an empty page?  A fair maiden cannot weave a tapestry without thread, nor can a bard compose a sonnet without words.  Bestow upon me a text, however humble, and I shall transform it into a verse most eloquent, fit for the Globe itself!". You don't have to do anything except translate the text into Shakespearean English, don't add random things yourself. The text is: \n${text}`;

  try {
    const response = await axios.post(API_URL, {
      contents: [{ parts: [{ text: prompt }] }],
    });
    const generatedText = response.data.candidates[0].content.parts[0].text;

    const storedHistory = await LocalStorage.getItem("history");
    let array: HistoryItem[] = [];

    if (typeof storedHistory === "string") {
      try {
        const parsedHistory = JSON.parse(storedHistory);
        if (Array.isArray(parsedHistory)) {
          array = parsedHistory;
        }
      } catch (error) {
        console.error("Error parsing stored history:", error);
      }
    }

    array.push({
      id: "" + (array.length + 1),
      originalText: text,
      shakespearifiedText: generatedText,
      timestamp: Date.now(),
    });

    await LocalStorage.setItem("history", JSON.stringify(array));
    return generatedText;
  } catch (error) {
    return "error";
  }
}
