import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const { prompt_ask, model_ask } = getPreferenceValues();
const toastTitle = "Answering...";

export default function Ask(props: { arguments: { query: string } }) {
  return ResultView(prompt_ask, model_ask, toastTitle, false, props.arguments.query);
}
