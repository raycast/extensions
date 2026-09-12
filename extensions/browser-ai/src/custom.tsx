import { getPreferenceValues } from "@raycast/api";
import { ResultView } from "./components/ResultView";

const prompt = getPreferenceValues().prompt_custom;
const model_override = getPreferenceValues().model_custom;
const toast_title = "Thinking...";

export default function CustomAction() {
  return <ResultView sys_prompt={prompt} model_override={model_override} toast_title={toast_title} />;
}
