import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_custom;
const toast_title = "Thinking...";

export default function CustomAction() {
  return ResultView(prompt, toast_title);
}
