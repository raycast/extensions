import { getPreferenceValues } from "@raycast/api";
import ResultView from "./hook/accessAPI";

const prompt = getPreferenceValues().prompt_synonyms;
const model_override = getPreferenceValues().model_synonyms;
const toast_title = "Thinking...";

export default function Synonyms() {
  return <ResultView sys_prompt={prompt} model_override={model_override} toast_title={toast_title} temperature={0.4} />;
}
