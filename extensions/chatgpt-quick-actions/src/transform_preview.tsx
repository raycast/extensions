import { LaunchProps, getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const model_override = getPreferenceValues().model_transform_preview;
const toast_title = "Thinking...";

export default function Preview(props: LaunchProps<{ arguments: Arguments.TransformPreview }>) {
  const { prompt } = props.arguments;
  return ResultView(prompt, model_override, toast_title);
}
