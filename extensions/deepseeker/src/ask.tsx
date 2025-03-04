import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_ask;
const model_override = getPreferenceValues().model_ask;
const toast_title = "Answering...";

export default function Ask(props: { arguments: { query: string } }) {
  return ResultView(prompt, model_override, toast_title, false, props.arguments.query);
}
