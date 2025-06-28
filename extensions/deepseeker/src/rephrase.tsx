import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

export default function Rephrase() {
  const { prompt_rephrase, model_rephrase } = getPreferenceValues();
  const toastTitle = "Rephrasing...";
  return ResultView(prompt_rephrase, model_rephrase, toastTitle, true);
}
