import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

export default function What() {
  const { prompt_what, model_what } = getPreferenceValues();
  const toastTitle = "Introducing...";
  return ResultView(prompt_what, model_what, toastTitle, true);
}
