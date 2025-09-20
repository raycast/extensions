import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Polish(props: LaunchProps<{ arguments?: Arguments.Polish }>) {
  await translate("PL", props.arguments?.text ?? props.fallbackText);
}
