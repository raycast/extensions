import { getSelectedText } from "@raycast/api";
import { CaptureForm, Resolved } from "./lib/CaptureForm";
import { suggestName } from "./lib/save";

async function resolve(): Promise<Resolved> {
  let text: string;
  try {
    text = await getSelectedText();
  } catch {
    throw new Error(
      "No text selected. Select some text in any app, then try again.",
    );
  }
  if (!text || text.trim().length === 0) {
    throw new Error(
      "No text selected. Select some text in any app, then try again.",
    );
  }
  return { content: text, suggestedName: suggestName(text) };
}

export default function Command() {
  return <CaptureForm resolve={resolve} />;
}
