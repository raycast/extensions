import { getPreferenceValues } from "@raycast/api";
import ResultView from "./hook/accessAPI";

const prompt = getPreferenceValues().prompt_task;
const model_override = getPreferenceValues().model_task;
const toast_title = "Thinking...";

export default function taskBreakdown() {
  return <ResultView sys_prompt={prompt} model_override={model_override} toast_title={toast_title} temperature={0.6} />;
}
