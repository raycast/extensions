import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Ukrainian(props: LaunchProps<{ arguments?: Arguments.Ukrainian }>) {
  await translate("UK", props.arguments?.text ?? props.fallbackText);
}
