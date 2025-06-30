import { getPreferenceValues } from "@raycast/api";
import { ResultView } from "./components/ResultView";

const prompt = getPreferenceValues().prompt_youtube;
const model_override = getPreferenceValues().model_youtube;
const toast_title = "Summarizing...";

export default function Youtube() {
  return (
    <ResultView
      sys_prompt={prompt}
      model_override={model_override}
      toast_title={toast_title}
      temperature={0.5}
      content_format="markdown"
    />
  );
}
