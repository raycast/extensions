import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Estonian(props: LaunchProps<{ arguments?: Arguments.Estonian }>) {
  await translate("ET", props.arguments?.text ?? props.fallbackText);
}
