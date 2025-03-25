import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_ask_on;
const modelOverride = getPreferenceValues().model_ask_on;
const toastTitle = "Answering on the selected text...";

export default function AskOn(props: { arguments: { query: string } }) {
  return ResultView(prompt, modelOverride, toastTitle, true, props.arguments.query);
}
