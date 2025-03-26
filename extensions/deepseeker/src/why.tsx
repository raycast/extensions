import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const { prompt_why, model_why } = getPreferenceValues();
const toastTitle = "Explaining...";

export default function Why() {
  return ResultView(prompt_why, model_why, toastTitle, true);
}
