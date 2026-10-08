import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function French(props: LaunchProps<{ arguments?: Arguments.French }>) {
  await translate("FR", props.arguments?.text ?? props.fallbackText);
}
