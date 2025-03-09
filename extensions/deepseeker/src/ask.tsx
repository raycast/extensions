import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_ask;
const modelOverride = getPreferenceValues().model_ask;
const toastTitle = "Answering...";

export default function Ask(props: { arguments: { query: string } }) {
  return ResultView(prompt, modelOverride, toastTitle, false, props.arguments.query);
}
