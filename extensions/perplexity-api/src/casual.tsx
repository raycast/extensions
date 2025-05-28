import { getPreferenceValues } from "@raycast/api";
import ResultView from "./hook/accessAPI";

const prompt = getPreferenceValues().prompt_casual;
const model_override = getPreferenceValues().model_casual;
const toast_title = "Rewriting...";

export default function Rewrite() {
  return <ResultView sys_prompt={prompt} model_override={model_override} toast_title={toast_title} />;
}
