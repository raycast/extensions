import { Clipboard, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { openai } from "./api";
import { getModelName, formatAPIError } from "./utils";
import { Stream } from "openai/streaming";
import { ChatCompletionChunk } from "openai/resources";
import { APIPromise } from "openai";

const model_override = getPreferenceValues().model_execute;
const provider_sort = getPreferenceValues().provider_sort_execute;

export default async function Command() {
  let selectedText = "";
  try {
    selectedText = await getSelectedText();
  } catch (error) {
    console.error(error);
    await showHUD(`No text selected (${error})`);
    return;
  }
  const model = getModelName(model_override);
  await showHUD(`Connecting to OpenRouter with model ${model}...`);

  try {
    const stream = await (openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: selectedText }],
      provider: {
        sort: provider_sort == "global" ? undefined : provider_sort,
      },
      stream: true,
    } as never) as unknown as APIPromise<Stream<ChatCompletionChunk>>);

    let text = "";
    for await (const part of stream) {
      const chunk = part.choices[0]?.delta?.content;
      if (chunk) text += chunk;
    }

    if (text.trim()) {
      await showHUD("Response pasted to the current application.");
      await Clipboard.paste(text.trim());
    } else {
      await showHUD("No response from OpenRouter.");
    }
  } catch (error) {
    await showHUD(`Error: ${formatAPIError(error)}`);
    console.error("execute error:", error);
  }
}
