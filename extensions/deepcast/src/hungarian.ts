import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Hungarian(props: LaunchProps) {
  await translate("HU", props.fallbackText);
}
