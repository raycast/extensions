import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function German(props: LaunchProps<{ arguments?: Arguments.German }>) {
  await translate("DE", props.arguments?.text ?? props.fallbackText);
}
