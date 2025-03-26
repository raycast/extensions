import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const { prompt_summarize, model_summarize } = getPreferenceValues();
const toastTitle = "Summarizing...";

export default function Summarize() {
  return ResultView(prompt_summarize, model_summarize, toastTitle, true);
}
