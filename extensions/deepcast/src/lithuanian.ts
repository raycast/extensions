import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Lithuanian(props: LaunchProps) {
  await translate("LT", props.fallbackText);
}
