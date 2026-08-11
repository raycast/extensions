import { Clipboard, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { openai } from "./api";
import { Stream } from "openai/streaming";
import { ChatCompletionChunk } from "openai/resources";
import { APIPromise } from "openai";
import { getModelName, formatAPIError } from "./utils";

const prompt = getPreferenceValues().prompt_proofread_no_ui;
const model_override = getPreferenceValues().model_proofread_no_ui;
const provider_sort = getPreferenceValues().provider_sort_proofread_no_ui;

export default async function ProofreadNoUi() {
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
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: selectedText },
      ],
      provider: {
        sort: provider_sort == "global" ? undefined : provider_sort,
      },
      stream: true,
    } as never) as unknown as APIPromise<Stream<ChatCompletionChunk>>);

    let text = "";
    let chunkCount = 0;
    for await (const part of stream) {
      const chunk = part.choices[0]?.delta?.content;
      if (chunk) {
        text += chunk;
        chunkCount++;
        if (chunkCount % 2 === 0) {
          await showHUD(`Receiving response... (${text.length} chars)`);
        }
      }
    }

    if (text.trim()) {
      await showHUD("Response pasted to the current application.");
      await Clipboard.paste(text.trim());
    } else {
      await showHUD("No response from OpenRouter.");
    }
  } catch (error) {
    await showHUD(`Error: ${formatAPIError(error)}`);
    console.error("proofread-no-ui error:", error);
  }
  return;
}
