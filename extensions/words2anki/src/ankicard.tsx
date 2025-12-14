import {
  Clipboard,
  getPreferenceValues,
  getSelectedText,
  showToast,
  Toast,
  showHUD,
} from "@raycast/api";
import { generateDefinition } from "./utils/deepseek";
import { addAnkiCard, checkAnkiConnect } from "./utils/anki";
import { Preferences } from "./types";

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Creating Anki Card...",
  });

  try {
    // Step 1: Get selected text (the word)
    toast.message = "Getting selected word...";
    let selectedWord: string;
    try {
      selectedWord = await getSelectedText();
      selectedWord = selectedWord.trim();

      if (!selectedWord) {
        throw new Error("No text selected. Please select a word first.");
      }
    } catch (error) {
      throw new Error(
        "Failed to get selected text. Please select a word and try again.",
      );
    }

    // Step 2: Get clipboard content (the context)
    toast.message = "Reading context from clipboard...";
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      throw new Error(
        "Clipboard is empty. Please copy the context sentence/paragraph first.",
      );
    }

    const context = clipboardText.trim();

    // Step 3: Check if AnkiConnect is available
    toast.message = "Checking Anki connection...";
    const isAnkiAvailable = await checkAnkiConnect(preferences.ankiConnectUrl);

    if (!isAnkiAvailable) {
      throw new Error(
        "Cannot connect to Anki. Please make sure:\n" +
          "1. Anki is running\n" +
          "2. AnkiConnect plugin is installed (code: 2055492159)\n" +
          "3. AnkiConnect is accessible at " +
          preferences.ankiConnectUrl,
      );
    }

    // Step 4: Generate definition using DeepSeek AI
    toast.message = "Generating definition with AI...";
    const definition = await generateDefinition(
      selectedWord,
      context,
      preferences.deepseekApiKey,
    );

    // Step 5: Add card to Anki
    toast.message = "Adding card to Anki...";
    await addAnkiCard(
      selectedWord,
      definition,
      context,
      preferences.ankiDeck,
      preferences.noteType,
      preferences.ankiConnectUrl,
    );

    // Success!
    await toast.hide();
    await showHUD(
      `✅ Card created for "${selectedWord}" in deck "${preferences.ankiDeck}"`,
    );
  } catch (error) {
    await toast.hide();

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to create Anki card",
      message: errorMessage,
    });

    console.error("Error creating Anki card:", error);
  }
}
