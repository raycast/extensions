import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Bulgarian(props: LaunchProps<{ arguments?: Arguments.Bulgarian }>) {
  await translate("BG", props.arguments?.text ?? props.fallbackText);
}
