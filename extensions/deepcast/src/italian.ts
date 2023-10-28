import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Italian(props: LaunchProps<{ arguments?: Arguments.Italian }>) {
  await translate("IT", props.arguments?.text ?? props.fallbackText);
}
