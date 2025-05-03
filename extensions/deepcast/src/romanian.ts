import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Romanian(props: LaunchProps<{ arguments?: Arguments.Romanian }>) {
  await translate("RO", props.arguments?.text ?? props.fallbackText);
}
