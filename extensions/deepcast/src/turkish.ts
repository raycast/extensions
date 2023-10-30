import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Turkish(props: LaunchProps) {
  await translate("TR", props.fallbackText);
}
