import { showToast, Toast, getPreferenceValues, getSelectedText, Clipboard, closeMainWindow } from "@raycast/api";
import OpenAI from "openai";

interface Preferences {
  apiKey: string;
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const openai = new OpenAI({
    apiKey: preferences.apiKey,
  });

  try {
    // Get the selected text
    const selectedText = await getSelectedText();

    if (!selectedText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text selected",
        message: "Please select some text to rephrase",
      });
      return;
    }

    // Show loading toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Rephrasing text...",
    });

    // Make API call to OpenAI
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `${selectedText}\n\nRephrase the above text`,
        },
      ],
      model: "gpt-3.5-turbo",
    });

    const rephrasedText = completion.choices[0].message.content;

    // Copy to clipboard
    await Clipboard.copy(rephrasedText || "");

    // Show success toast
    await showToast({
      style: Toast.Style.Success,
      title: "Text rephrased",
      message: "Rephrased text copied to clipboard",
    });

    // Close the extension window
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to rephrase text",
      message: String(error),
    });
  }
}
