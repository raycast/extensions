import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Hungarian(props: LaunchProps<{ arguments?: Arguments.Hungarian }>) {
  await translate("HU", props.arguments?.text ?? props.fallbackText);
}
