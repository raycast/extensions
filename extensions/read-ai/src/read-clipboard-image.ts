import { getPreferenceValues, showToast, Toast, Clipboard } from "@raycast/api";
import { ImageToTextProcessor } from "./processors/image-to-text-processor";
import { TextToSpeechProcessor } from "./processors/text-to-speech-processor";

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const processor = new ImageToTextProcessor(preferences.apiKey);
  const textToSpeechProcessor = new TextToSpeechProcessor(preferences);

  const imageUrl = await Clipboard.readText();
  const maxTokens = 600; // Max tokens for GPT-4 Vision Default is 300

  if (!imageUrl) {
    showToast(Toast.Style.Failure, "No image URL found on clipboard");
    return;
  }

  await processor.processSelectedImage(imageUrl, maxTokens).then(async (description: string | null) => {
    if (description) {
      console.log(description);
      // Use the TextToSpeechProcessor to speak the description
      await textToSpeechProcessor.processTextDirectly(description);
    } else {
      showToast(Toast.Style.Failure, "No description found");
      console.error("No description returned for the selected image.");
    }
  });
}
