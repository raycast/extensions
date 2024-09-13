import { LaunchProps, getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const model_override = getPreferenceValues().model_preview_transform;
const toast_title = "Thinking...";

export default function Preview(props: LaunchProps<{ arguments: Arguments.PreviewTransform }>) {
  const { prompt } = props.arguments;
  return ResultView(prompt, model_override, toast_title);
}
