import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Slovak(props: LaunchProps<{ arguments?: Arguments.Slovak }>) {
  await translate("SK", props.arguments?.text ?? props.fallbackText);
}
