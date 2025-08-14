import { Clipboard, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { openai } from "./api";
import { getModelName } from "./utils";

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
  const res = await openai.chat.completions.create({
    model: model,
    messages: [{ role: "user", content: selectedText }],
    provider: {
      sort: provider_sort == "global" ? undefined : provider_sort,
    },
  } as never);
  const text = res.choices[0]?.message?.content?.trim() || "";
  if (text) {
    await showHUD("Response pasted to the current application.");
    await Clipboard.paste(text);
  } else {
    await showHUD("No response from OpenRouter.");
  }
}
