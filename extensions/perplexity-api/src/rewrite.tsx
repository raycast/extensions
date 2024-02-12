import { getPreferenceValues } from "@raycast/api";
import ResultView from "./perplexityAPI";

const prompt = getPreferenceValues().prompt_rewrite;
const model_override = getPreferenceValues().model_rewrite;
const toast_title = "Rewriting...";

export default function Rewrite() {
  return <ResultView sys_prompt={prompt} model_override={model_override} toast_title={toast_title} />;
}
