import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Lithuanian(props: LaunchProps<{ arguments?: Arguments.Lithuanian }>) {
  await translate("LT", props.arguments?.text ?? props.fallbackText);
}
