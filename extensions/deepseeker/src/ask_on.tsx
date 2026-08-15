import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

export default function AskOn(props: { arguments: { query: string } }) {
  const { prompt_ask_on, model_ask_on } = getPreferenceValues();
  const toastTitle = "Answering on the selected text...";
  return ResultView(prompt_ask_on, model_ask_on, toastTitle, true, props.arguments.query);
}
