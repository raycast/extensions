import { getPreferenceValues } from "@raycast/api";
import ResultView from "./hook/accessAPI";

const prompt = getPreferenceValues().prompt_translate;
const model_override = getPreferenceValues().model_translate;
const toast_title = "Translating...";

export default function Translate() {
  return <ResultView sys_prompt={prompt} model_override={model_override} toast_title={toast_title} temperature={0.4} />;
}
