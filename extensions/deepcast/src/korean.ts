import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Korean(props: LaunchProps<{ arguments?: Arguments.Korean }>) {
  await translate("KO", props.arguments?.text ?? props.fallbackText);
}
