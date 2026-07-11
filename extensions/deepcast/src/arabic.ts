import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Arabic(props: LaunchProps<{ arguments?: Arguments.Arabic }>) {
  await translate("AR", props.arguments?.text ?? props.fallbackText);
}
