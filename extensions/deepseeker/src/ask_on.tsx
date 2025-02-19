import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_ask_on;
const model_override = getPreferenceValues().model_ask_on;
const toast_title = "Answering on the selected text...";

export default function AskOn(props: { arguments: { query: string } }) {
  return ResultView(prompt, model_override, toast_title, true, props.arguments.query);
}
