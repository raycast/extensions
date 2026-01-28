import { getPreferenceValues } from "@raycast/api";
import ResultView from "./hook/accessAPI";

const prompt = getPreferenceValues().prompt_improve;
const model_override = getPreferenceValues().model_improve;
const toast_title = "Improving...";

export default function Improve() {
  return <ResultView sys_prompt={prompt} model_override={model_override} toast_title={toast_title} temperature={0.8} />;
}
