import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Finnish(props: LaunchProps<{ arguments?: Arguments.Finnish }>) {
  await translate("FI", props.arguments?.text ?? props.fallbackText);
}
