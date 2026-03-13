import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Norwegian(props: LaunchProps<{ arguments?: Arguments.Norwegian }>) {
  await translate("NB", props.arguments?.text ?? props.fallbackText);
}
