import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Ukrainian(props: LaunchProps) {
  await translate("UK", props.fallbackText);
}
