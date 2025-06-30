import { getPreferenceValues } from "@raycast/api";
import ResultView from "./hook/accessAPI";

const prompt = getPreferenceValues().prompt_summarize;
const model_override = getPreferenceValues().model_summarize;
const toast_title = "Summarizing...";

export default function Summarize() {
  return <ResultView sys_prompt={prompt} model_override={model_override} toast_title={toast_title} temperature={0.4} />;
}
