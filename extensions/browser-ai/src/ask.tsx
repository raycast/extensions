import { LaunchProps } from "@raycast/api";
import { ResultView } from "./components/ResultView";
import { getPreferenceValues } from "@raycast/api";

const toast_title = "Generating...";
const model_override = getPreferenceValues().model_ask;

export interface AskArguments {
  query: string;
}

export default function Ask(props: LaunchProps<{ arguments: AskArguments }>) {
  return (
    <ResultView
      sys_prompt={props.arguments.query}
      model_override={model_override}
      toast_title={toast_title}
      temperature={0.5}
      content_format="text"
    />
  );
}
