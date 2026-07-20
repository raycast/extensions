import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

export default function Summarize() {
  const { prompt_summarize, model_summarize } = getPreferenceValues();
  const toastTitle = "Summarizing...";
  return ResultView(prompt_summarize, model_summarize, toastTitle, true);
}
