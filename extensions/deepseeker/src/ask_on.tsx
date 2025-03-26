import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const { prompt_ask_on, model_ask_on } = getPreferenceValues();
const toastTitle = "Answering on the selected text...";

export default function AskOn(props: { arguments: { query: string } }) {
  return ResultView(prompt_ask_on, model_ask_on, toastTitle, true, props.arguments.query);
}
