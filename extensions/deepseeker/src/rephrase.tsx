import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const { prompt_rephrase, model_rephrase } = getPreferenceValues();
const toastTitle = "Rephrasing...";

export default function Rephrase() {
  return ResultView(prompt_rephrase, model_rephrase, toastTitle, true);
}
