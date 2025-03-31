import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

export default function Why() {
  const { prompt_why, model_why } = getPreferenceValues();
  const toastTitle = "Explaining...";
  return ResultView(prompt_why, model_why, toastTitle, true);
}
