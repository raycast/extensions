import { getPreferenceValues } from "@raycast/api";
import { ResultView } from "./components/ResultView";

const prompt = getPreferenceValues().prompt_inspect;
const model_override = getPreferenceValues().model_inspect;
const toast_title = "Inspecting...";

export default function Inspect() {
  return (
    <ResultView
      sys_prompt={prompt}
      model_override={model_override}
      toast_title={toast_title}
      temperature={0.5}
      content_format="html"
    />
  );
}
