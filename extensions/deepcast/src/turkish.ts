import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Turkish(props: LaunchProps<{ arguments?: Arguments.Turkish }>) {
  await translate("TR", props.arguments?.text ?? props.fallbackText);
}
