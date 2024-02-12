import { getPreferenceValues } from "@raycast/api";
import ResultView from "./hook/perplexityAPI";

const prompt = getPreferenceValues().prompt_improve;
const model_override = getPreferenceValues().model_improve;
const toast_title = "Thinking...";

export default function Rewrite() {
  return <ResultView sys_prompt={prompt} model_override={model_override} toast_title={toast_title} />;
}
