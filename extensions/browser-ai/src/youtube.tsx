import { getPreferenceValues } from "@raycast/api";
import ResultView from "./hook/perplexityAPI";

const prompt = getPreferenceValues().prompt_youtube;
const model_override = getPreferenceValues().model_youtube;
const toast_title = "Summarizing...";

export default function Rewrite() {
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
