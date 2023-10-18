import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Estonian(props: LaunchProps) {
  await translate("ET", props.fallbackText);
}
