import { getPreferenceValues, LaunchProps } from "@raycast/api";
import ResultView from "./common";

export default function Ask(props: LaunchProps<{ arguments?: Arguments.Ask }>) {
  const { prompt_ask, model_ask } = getPreferenceValues();
  const toastTitle = "Answering...";
  return ResultView(prompt_ask, model_ask, toastTitle, false, props.arguments?.query ?? props.fallbackText);
}
