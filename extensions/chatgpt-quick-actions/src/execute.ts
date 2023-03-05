import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { model, openai } from "./api";

export default async function Command() {
  const selectedText = await getSelectedText();
  await showHUD("Connecting to OpenAI...");
  const res = await openai.createChatCompletion({
    model: model,
    messages: [{ role: "user", content: selectedText }],
  });
  const data = res.data;
  const text = data.choices[0]?.message?.content.trim();
  if (text) {
    showHUD("Response pasted to the current application.");
    await Clipboard.paste(text);
  } else {
    await showHUD("No response from OpenAI.");
  }
}
