import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const { prompt_what, model_what } = getPreferenceValues();
const toastTitle = "Introducing...";

export default function What() {
  return ResultView(prompt_what, model_what, toastTitle, true);
}
