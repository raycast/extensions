import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_refine;
const model_override = getPreferenceValues().model_refine;
const toast_title = "Rewriting...";

export default function Refine() {
  return <ResultView sys_prompt={prompt} model_override={model_override} toast_title={toast_title} temperature={0.1} />;
}
