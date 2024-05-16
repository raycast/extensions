import { Toast, showToast } from "@raycast/api";
import OpenAI from "openai";
import { describeImage } from "./description";
import { createGenerationPrompt, generateImage } from "./generation";

export async function generateModification(client: OpenAI, screenshotPath: string, prompt: string): Promise<string> {
  // Description
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Generating image description",
  });
  const imageDescription = await describeImage(client, screenshotPath);
  console.log(imageDescription);

  // Generation
  toast.title = "Modifying image";
  const generationPrompt = createGenerationPrompt(imageDescription, prompt);
  const modifiedImageUrl = await generateImage(client, generationPrompt);
  toast.style = Toast.Style.Success;
  toast.title = "Modification completed";
  return modifiedImageUrl;
}
