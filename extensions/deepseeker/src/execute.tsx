import { Clipboard, getPreferenceValues, getSelectedText, showHUD, showToast, Toast } from "@raycast/api";
import { global_model, openai } from "./api";

const model_override = getPreferenceValues().model_execute;
const model = model_override == "global" ? global_model : model_override;

export default async function Command() {
  let selectedText = "";
  try {
    selectedText = await getSelectedText();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot find selected text",
      message: String(error),
    });
  }

  // only if selected text is a non-empty text string do we proceed
  // if it is empty or not characters, we show a toast message
  if (!selectedText || !selectedText.trim()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot find selected text",
    });
    return;
  }

  await showHUD(`Executing selected prompt...`);
  const res = await openai.chat.completions.create({
    model: model,
    messages: [{ role: "user", content: selectedText }],
  });
  const text = res.choices[0]?.message?.content?.trim() || "";
  if (text) {
    await Clipboard.paste(text);
    await showHUD("Response pasted to the current application.");
  } else {
    await showHUD(`No response from model ${model}`);
  }
}
