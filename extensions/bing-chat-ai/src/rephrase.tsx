import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().promptRephrase;
const toastTitle = "Rephrase...";

export default function Rewrite() {
  return ResultView(prompt, toastTitle);
}
