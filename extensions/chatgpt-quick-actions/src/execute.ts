import { Clipboard, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { global_model, openai } from "./api";

const model_override = getPreferenceValues().model_execute;
const model = model_override == "global" ? global_model : model_override;

export default async function Command() {
  const selectedText = await getSelectedText();
  await showHUD(`Connecting to OpenAI with model ${model}...`);
  const res = await openai.chat.completions.create({
    model: model,
    messages: [{ role: "user", content: selectedText }],
  });
  const text = res.choices[0]?.message?.content?.trim() || "";
  if (text) {
    await showHUD("Response pasted to the current application.");
    await Clipboard.paste(text);
  } else {
    await showHUD("No response from OpenAI.");
  }
}
