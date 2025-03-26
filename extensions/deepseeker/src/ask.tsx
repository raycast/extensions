import { getPreferenceValues, LaunchProps } from "@raycast/api";
import ResultView from "./common";

const { prompt_ask, model_ask } = getPreferenceValues();
const toastTitle = "Answering...";

export default function Ask(props: LaunchProps<{ arguments?: Arguments.Ask }>) {
  return ResultView(prompt_ask, model_ask, toastTitle, false, props.arguments?.query ?? props.fallbackText);
}
