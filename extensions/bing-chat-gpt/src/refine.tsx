import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().promptRefine;
const toastTitle = "Refine...";

export default function Rewrite() {
  return ResultView(prompt, toastTitle);
}
