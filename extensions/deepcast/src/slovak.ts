import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Slovak(props: LaunchProps) {
  await translate("SK", props.fallbackText);
}
