import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = "You are a helpful assistant.";
const model_override = getPreferenceValues().model_preview;
const toast_title = "Thinking...";

export default function Preview() {
  return ResultView(prompt, model_override, toast_title);
}
