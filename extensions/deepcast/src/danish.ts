import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Danish(props: LaunchProps<{ arguments?: Arguments.Danish }>) {
  await translate("DA", props.arguments?.text ?? props.fallbackText);
}
