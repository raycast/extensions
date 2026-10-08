import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Dutch(props: LaunchProps<{ arguments?: Arguments.Dutch }>) {
  await translate("NL", props.arguments?.text ?? props.fallbackText);
}
